import config from '../config/salons.js';

const QTY_KEYS = ['disposableQuantity', 'disposable_quantity', 'availableQuantity', 'available_quantity', 'quantity', 'stock_quantity'];
const STOCK_KEYS = ['stockId', 'stock_id'];
const SIZE_KEYS = ['sizeId', 'size_id'];
const TIMEOUT_MS = 5000;

const normalizeHost = (h) => String(h || '').toLowerCase().replace(/^www\./, '');
// Magazyn może przyjść jako 1 albo "M1" – oba zapisy traktujemy tak samo.
const normalizeStock = (id) => String(id).trim().replace(/^m/i, '');
const allowedHosts = new Set(config.salons.map((s) => normalizeHost(s.domain)));

function hostOf(origin) {
  try { return normalizeHost(new URL(origin).hostname); } catch { return null; }
}

function pick(obj, keys) {
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}

// Zbiera ilości per magazyn i rozmiar niezależnie od zagnieżdżenia odpowiedzi
// (stock -> sizes albo size -> stocks). Węzeł z ilością jest liściem, żeby nie liczyć podwójnie.
export function collectStocks(node, ctx = {}, out = new Map()) {
  if (Array.isArray(node)) { node.forEach((n) => collectStocks(n, ctx, out)); return out; }
  if (!node || typeof node !== 'object') return out;

  const stockId = pick(node, STOCK_KEYS) ?? ctx.stockId;
  const sizeId = pick(node, SIZE_KEYS) ?? ctx.sizeId;
  const raw = pick(node, QTY_KEYS);
  const qty = raw === undefined ? NaN : Number(raw);

  if (stockId !== undefined && Number.isFinite(qty)) {
    const key = normalizeStock(stockId);
    const entry = out.get(key) || { total: 0, sizes: {} };
    const sizeKey = sizeId === undefined ? 'uniw' : String(sizeId);
    entry.total += qty;
    entry.sizes[sizeKey] = (entry.sizes[sizeKey] || 0) + qty;
    out.set(key, entry);
    return out;
  }
  for (const v of Object.values(node)) if (v && typeof v === 'object') collectStocks(v, { stockId, sizeId }, out);
  return out;
}

function level(qty) {
  if (qty <= 0) return 'none';
  return qty <= config.lowStockThreshold ? 'low' : 'available';
}

function present(entry) {
  const sizes = {};
  for (const [k, v] of Object.entries(entry.sizes)) sizes[k] = Math.max(0, v);
  const total = Math.max(0, entry.total);
  if (config.display === 'exact') return { total, sizes };
  return {
    level: level(total),
    sizes: Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, level(v)])),
  };
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const originHost = origin ? hostOf(origin) : null;
  const originAllowed = originHost !== null && allowedHosts.has(originHost);

  if (originAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!originAllowed) return res.status(403).json({ error: 'origin_not_allowed' });

  const productId = new URL(req.url, 'http://localhost').searchParams.get('productId') || '';
  if (!/^\d{1,10}$/.test(productId)) return res.status(400).json({ error: 'invalid_product_id' });

  const { IDOSELL_PANEL_DOMAIN, IDOSELL_API_VERSION, IDOSELL_API_KEY } = process.env;
  if (!IDOSELL_PANEL_DOMAIN || !IDOSELL_API_VERSION || !IDOSELL_API_KEY) {
    console.error('stany-salonow: brak zmiennych środowiskowych');
    return res.status(500).json({ error: 'config' });
  }

  const url = `https://${IDOSELL_PANEL_DOMAIN}/api/admin/${IDOSELL_API_VERSION}/products/stocks?identType=id&products=${productId}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let data;
  try {
    const r = await fetch(url, { headers: { 'X-API-KEY': IDOSELL_API_KEY, Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) {
      console.error('stany-salonow: IdoSell API status', r.status);
      return res.status(502).json({ error: 'upstream' });
    }
    data = await r.json();
  } catch (e) {
    console.error('stany-salonow: IdoSell API', e.name);
    return res.status(502).json({ error: 'upstream' });
  } finally {
    clearTimeout(timer);
  }

  const stocks = collectStocks(data);
  const salons = config.salons.map((s) => ({
    id: s.id,
    name: s.name,
    domain: s.domain,
    ...present(stocks.get(normalizeStock(s.stockId)) || { total: 0, sizes: {} }),
  }));

  res.setHeader('Cache-Control', `public, s-maxage=${config.cacheSeconds}, stale-while-revalidate=${config.cacheSeconds * 2}`);
  return res.status(200).json({
    productId,
    display: config.display,
    lowStockThreshold: config.lowStockThreshold,
    linkTemplate: config.linkTemplate,
    salons,
  });
}
