// Jedna pozycja = jeden salon: domena sklepu + magazyn w panelu IdoSell.
// Lista domen jest jednocześnie białą listą CORS dla /api/stock.
export default {
  salons: [
    { id: 'katowice', name: 'Katowice', domain: 'katowice.example.pl', stockId: 2 },
    { id: 'krakow',   name: 'Kraków',   domain: 'krakow.example.pl',   stockId: 3 },
    { id: 'gliwice',  name: 'Gliwice',  domain: 'gliwice.example.pl',  stockId: 4 },
  ],

  // 'exact'  – klient widzi liczbę sztuk
  // 'levels' – klient widzi tylko: dostępny / ostatnie sztuki / brak (dokładne stany nie wychodzą z API)
  display: 'levels',
  lowStockThreshold: 5,

  // null  – link do salonu = ta sama ścieżka produktu na domenie salonu
  // tekst – szablon ścieżki z {id}, np. '/product-pol-{id}.html'
  linkTemplate: null,

  cacheSeconds: 60,
};
