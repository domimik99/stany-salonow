// Jedna pozycja = jeden salon: domena sklepu + magazyn w panelu IdoSell (M1 → stockId 1).
// id = slug oddziału z dodatku „Twój oddział” (parametr ?oddzial= w linkach).
// Lista domen jest jednocześnie białą listą CORS dla /api/stock.
export default {
  salons: [
    { id: 'katowice',         name: 'Katowice',         domain: 'demo256-pl.yourtechnicaldomain.com',       stockId: 1 },
    { id: 'chrzanow',         name: 'Chrzanów',         domain: 'demo256-pl-shop2.yourtechnicaldomain.com', stockId: 3 },
    { id: 'dabrowa-gornicza', name: 'Dąbrowa Górnicza', domain: 'demo256-pl-shop3.yourtechnicaldomain.com', stockId: 8 },
    { id: 'gliwice',          name: 'Gliwice',          domain: 'demo256-pl-shop4.yourtechnicaldomain.com', stockId: 4 },
    { id: 'oswiecim',         name: 'Oświęcim',         domain: 'demo256-pl-shop5.yourtechnicaldomain.com', stockId: 5 },
    { id: 'sosnowiec',        name: 'Sosnowiec',        domain: 'demo256-pl-shop6.yourtechnicaldomain.com', stockId: 6 },
    { id: 'tarnowskie-gory',  name: 'Tarnowskie Góry',  domain: 'demo256-pl-shop7.yourtechnicaldomain.com', stockId: 7 },
  ],

  // 'exact'  – klient widzi liczbę sztuk
  // 'levels' – klient widzi tylko: dostępny / ostatnie sztuki / brak (dokładne stany nie wychodzą z API)
  display: 'exact',
  lowStockThreshold: 5,

  // null  – link do salonu = ta sama ścieżka produktu na domenie salonu
  // tekst – szablon ścieżki z {id}, np. '/pl/products/-{id}.html'
  linkTemplate: null,

  cacheSeconds: 60,
};
