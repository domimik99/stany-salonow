import config from '../config/salons.js';

const QTY_KEYS = ['disposableQuantity', 'disposable_quantity', 'availableQuantity', 'available_quantity', 'quantity', 'stock_quantity'];
const STOCK_KEYS = ['stockId', 'stock_id'];
const SIZE_KEYS = ['sizeId', 'size_id'];
const TIMEOUT_MS = 5000;
const MAX_PRODUCTS = 30;
const CONCURRENCY = 5;

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

async function fetchProduct(productId, env) {
  const url = `https://${env.IDOSELL_PANEL_DOMAIN}/api/admin/${env.IDOSELL_API_VERSION}/products/stocks?identType=id&products=${productId}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { 'X-API-KEY': env.IDOSELL_API_KEY, Accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) { console.error('stany-salonow: IdoSell API status', r.status, 'product', productId); return null; }
    const stocks = collectStocks(await r.json());
    return Object.fromEntries(config.salons.map((s) => [s.id, present(stocks.get(normalizeStock(s.stockId)) || { total: 0, sizes: {} })]));
  } catch (e) {
    console.error('stany-salonow: IdoSell API', e.name, 'product', productId);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimited(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function fail(res, status, error) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json({ error });
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
  if (req.method !== 'GET') return fail(res, 405, 'method_not_allowed');
  if (!originAllowed) return fail(res, 403, 'origin_not_allowed');

  const params = new URL(req.url, 'http://localhost').searchParams;
  // Domena sklepu w adresie = osobny wpis w cache CDN dla każdego salonu (nagłówek CORS zawsze pasuje).
  if (normalizeHost(params.get('shop')) !== originHost) return fail(res, 400, 'shop_mismatch');

  const ids = [...new Set((params.get('productIds') || params.get('productId') || '').split(',').map((s) => s.trim()).filter(Boolean))];
  if (!ids.length || ids.length > MAX_PRODUCTS || !ids.every((id) => /^\d{1,10}$/.test(id))) return fail(res, 400, 'invalid_product_ids');

  const env = process.env;
  if (!env.IDOSELL_PANEL_DOMAIN || !env.IDOSELL_API_VERSION || !env.IDOSELL_API_KEY) {
    console.error('stany-salonow: brak zmiennych środowiskowych');
    return fail(res, 500, 'config');
  }

  const results = await mapLimited(ids, CONCURRENCY, (id) => fetchProduct(id, env));
  if (results.every((r) => r === null)) return fail(res, 502, 'upstream');

  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${config.cacheSeconds}, stale-while-revalidate=${config.cacheSeconds * 2}`);
  return res.status(200).json({
    display: config.display,
    lowStockThreshold: config.lowStockThreshold,
    linkTemplate: config.linkTemplate,
    salons: config.salons.map(({ id, name, domain }) => ({ id, name, domain })),
    products: Object.fromEntries(ids.map((id, i) => [id, results[i]])),
  });
}
