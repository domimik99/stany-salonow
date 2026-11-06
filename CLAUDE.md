# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Czym jest

Widget dla sklepów IdoSell (karta towaru + koszyk) pokazujący stany produktu w salonach, plus funkcja serwerowa Vercel będąca proxy do API Admin IdoSell. Jeden panel IdoSell, wiele sklepów (domen) – jeden sklep i jeden magazyn na salon; produkt ma to samo ID we wszystkich sklepach. Szczegóły biznesowe i checklista testów: `README.md`.

## Komendy

Brak builda, zależności, testów i lintera (`package.json` deklaruje tylko `"type": "module"` i `node >=18`). Wdrożenie: Vercel przez integrację z GitHub – push na `main` = produkcja, więc zmiany najpierw na preview, potem code review i change management.

Weryfikacja kształtu odpowiedzi upstream (z README):

```bash
curl -s -H "X-API-KEY: $IDOSELL_API_KEY" \
  "https://$IDOSELL_PANEL_DOMAIN/api/admin/$IDOSELL_API_VERSION/products/stocks?identType=id&products=123"
```

## Przepływ danych

- `public/widget.js` – osadzany w panelu (`Sklep > Dodatki HTML/JS`, typ **HTML**, podstrony Karta towaru i Koszyk) jako `<script src="https://<projekt>.vercel.app/widget.js" defer></script>`. Endpoint domyślnie `/api/stock` na domenie skryptu, nadpisywalny atrybutem `data-api`. Na karcie towaru czyta ID z `#projector_form`, w koszyku pobiera produkty z GraphQL sklepu (`/graphql/v1/`). Woła `GET /api/stock?productIds=…&shop=<bieżąca domena>`.
- `api/stock.js` – dla każdego ID (max 30, współbieżność 5, timeout 5 s) woła `products/stocks` z nagłówkiem `X-API-KEY`, parsuje odpowiedź rekurencyjnie (`collectStocks`) i zwraca tylko salony z konfiguracji.
- `config/salons.js` – jedyne źródło konfiguracji: salony (`id` = slug `?oddzial=`, `name`, `domain`, `stockId`), `display` (`'exact'` | `'levels'`), `lowStockThreshold`, `linkTemplate`, `cacheSeconds`. Lista domen jest jednocześnie białą listą CORS.

## Zmienne środowiskowe

`IDOSELL_PANEL_DOMAIN` (bez `https://`), `IDOSELL_API_VERSION` (np. `v6`), `IDOSELL_API_KEY` – tylko w ustawieniach projektu Vercel; klucz nigdy nie trafia do przeglądarki ani do repo. Brak którejkolwiek → 500 `config`.

## Pułapki

- CORS: origin musi być na liście domen z `config/salons.js` (porównanie bez `www.`, lowercase), inaczej 403. Parametr `shop` musi równać się hostowi origin (400 `shop_mismatch`) – służy jako osobny klucz cache CDN per salon, bo odpowiedź zawiera `Access-Control-Allow-Origin` konkretnej domeny.
- Cache: sukces = `s-maxage=cacheSeconds, stale-while-revalidate=2×`; błędy = `no-store`. Gdy wszystkie produkty zawiodą upstream → 502.
- Parser upstream jest heurystyczny: nazwy pól w `QTY_KEYS` / `STOCK_KEYS` / `SIZE_KEYS` (kolejność = priorytet, ilość dyspozycyjna przed całkowitą); magazyn `"M1"` i `1` traktowane jako ten sam. Węzeł z ilością jest liściem – nie zmieniać, by nie liczyć podwójnie. Brak rozmiaru = `uniw`.
- Tryb `'levels'` ukrywa dokładne ilości już po stronie API – widget musi obsługiwać oba kształty odpowiedzi.
- Przycisk „Przejdź” symuluje klik w `a.swr-om__link` (zewnętrzny dodatek przenoszenia koszyka); bez niego działa zwykły link z `?oddzial=`.
- Widget re-montuje link przez `MutationObserver`, bo szablon IdoSell przerysowuje kartę przy zmianie rozmiaru. Guard `window.__ssaWidget` zapobiega podwójnemu ładowaniu.
