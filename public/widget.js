/* Stany w salonach – widget karty towaru IdoSell.
   Osadzenie (Sklep > Dodatki HTML/JS, typ HTML, Karta towaru):
   <script src="https://<projekt>.vercel.app/widget.js" defer></script>
   data-anchor – miejsce na link (domyślnie wiersz #projector_stocks; gdy go brak – za #projector_form)
   data-api    – adres endpointu (domyślnie /api/stock na domenie skryptu) */
(() => {
  const script = document.currentScript;
  if (!script || window.__ssaWidget) return;
  window.__ssaWidget = true;

  const API = script.dataset.api || new URL('/api/stock', script.src).href;
  const ANCHOR = script.dataset.anchor || '#projector_stocks';
  const FALLBACK_ANCHOR = '#projector_form';

  const LEVEL_TEXT = { available: 'Dostępny', low: 'Ostatnie sztuki', none: 'Brak w salonie' };
  const LEVEL_RANK = { available: 2, low: 1, none: 0 };

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  const normalizeHost = (h) => String(h || '').toLowerCase().replace(/^www\./, '');
  const currentHost = normalizeHost(location.hostname);

  function getProductId() {
    const form = document.querySelector('#projector_form');
    const candidates = [
      form && form.dataset.product_id,
      (document.querySelector('#projector_form [name="product"]') || {}).value,
      (location.pathname.match(/-(\d+)\.html$/) || [])[1],
    ];
    return candidates.find((v) => /^\d+$/.test(v || '')) || null;
  }

  function getSelectedSize() {
    const el = document.querySelector(
      '#projector_form input[name="size"]:checked, #projector_form select[name="size"], #projector_form input[type="hidden"][name="size"]'
    );
    return el && el.value ? String(el.value) : null;
  }

  function getProductName() {
    const h = document.querySelector('.product_name__name, #projector_productname h1');
    return h ? h.textContent.trim() : '';
  }

  const style = document.createElement('style');
  style.textContent = `
    .ssa-trigger{display:inline;padding:0;margin:0;border:0;background:none;font:inherit;color:inherit;
      text-decoration:underline;text-underline-offset:.2em;cursor:pointer}
    .ssa-trigger.--standalone{display:inline-flex;align-items:center;gap:.45em;margin:.75em 0}
    .ssa-trigger.--standalone svg{width:16px;height:16px;color:#0066b3}
    .ssa-trigger:hover{color:#0066b3}
    .ssa-trigger:focus-visible{outline:2px solid #0066b3;outline-offset:2px}

    .ssa{--ssa-navy:#0d1f38;--ssa-blue:#0066b3;--ssa-blue-soft:#f5f9fd;--ssa-line:#e6e8eb;--ssa-text:#2f3337;--ssa-muted:#6b7280;
      --ssa-ok:#1f8a3b;--ssa-low:#d97706;--ssa-none:#b8bec6;
      position:fixed;inset:0;z-index:2147483000;visibility:hidden;pointer-events:none;
      font-family:Lato,"Segoe UI",Arial,sans-serif;font-size:15px;line-height:1.4;color:var(--ssa-text)}
    .ssa *,.ssa *::before,.ssa *::after{box-sizing:border-box;margin:0}
    .ssa.is-open{visibility:visible;pointer-events:auto}
    .ssa__backdrop{position:absolute;inset:0;background:rgba(8,15,28,.55);opacity:0;transition:opacity .22s}
    .ssa.is-open .ssa__backdrop{opacity:1}
    .ssa__panel{position:absolute;top:0;right:0;bottom:0;width:min(440px,100vw);display:flex;flex-direction:column;background:#fff;
      box-shadow:-18px 0 48px rgba(0,0,0,.22);transform:translateX(100%);transition:transform .26s cubic-bezier(.2,.8,.2,1);outline:none}
    .ssa.is-open .ssa__panel{transform:none}

    .ssa__head{position:relative;flex:0 0 auto;padding:22px 64px 20px 24px;background:var(--ssa-navy);color:#fff;border-bottom:4px solid var(--ssa-blue)}
    .ssa__eyebrow{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9ec9f2}
    .ssa__eyebrow svg{width:15px;height:15px;color:#5aa9f0}
    .ssa__title{margin-top:6px;font-size:22px;line-height:1.25;font-weight:700;color:#fff}
    .ssa__product{margin-top:6px;font-size:14px;color:#cfd8e3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .ssa__close{position:absolute;top:14px;right:14px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;padding:0;
      border:0;border-radius:50%;background:transparent;color:#cfd8e3;cursor:pointer;transition:background-color .15s,color .15s}
    .ssa__close:hover,.ssa__close:focus-visible{background:rgba(255,255,255,.12);color:#fff;outline:none}
    .ssa__close svg{width:20px;height:20px}

    .ssa__body{flex:1 1 auto;overflow-y:auto;padding:18px 24px 8px;overscroll-behavior:contain}
    .ssa__summary{margin-bottom:14px;font-size:14px;color:var(--ssa-muted)}
    .ssa__summary b{color:var(--ssa-text)}
    .ssa__list{list-style:none;padding:0;display:grid;gap:8px}

    .ssa__item{display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:4px 14px;min-height:72px;padding:14px 16px;
      border:1px solid var(--ssa-line);background:#fff;transition:border-color .15s,box-shadow .15s}
    .ssa__item.--here{border-color:var(--ssa-blue);background:var(--ssa-blue-soft);box-shadow:inset 4px 0 0 var(--ssa-blue)}
    .ssa__item.--none .ssa__city{color:var(--ssa-muted)}
    .ssa__pin{grid-row:1 / span 2;grid-column:1;width:20px;height:20px;color:var(--ssa-blue)}
    .ssa__item.--none .ssa__pin{color:var(--ssa-none)}
    .ssa__name{grid-column:2;display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;min-width:0}
    .ssa__city{font-size:16px;font-weight:700}
    .ssa__badge{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;line-height:1.2;padding:3px 8px;
      background:var(--ssa-blue);color:#fff}
    .ssa__stock{grid-column:2;display:flex;align-items:baseline;gap:8px;font-size:14px;color:var(--ssa-muted)}
    .ssa__qty{display:inline-flex;align-items:center;gap:7px;font-weight:700;color:var(--ssa-text)}
    .ssa__qty::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--ssa-ok)}
    .ssa__item.--low .ssa__qty::before{background:var(--ssa-low)}
    .ssa__item.--none .ssa__qty{color:var(--ssa-muted);font-weight:400}
    .ssa__item.--none .ssa__qty::before{background:var(--ssa-none)}
    .ssa__note{font-size:13px}
    .ssa__item.--low .ssa__note{color:var(--ssa-low);font-weight:700}

    .ssa__go{grid-row:1 / span 2;grid-column:3;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 14px 0 16px;
      background:var(--ssa-blue);border:1px solid var(--ssa-blue);color:#fff!important;text-decoration:none!important;
      font:inherit;font-size:13px;font-weight:700;letter-spacing:.02em;white-space:nowrap;cursor:pointer;
      transition:background-color .15s,border-color .15s}
    .ssa__go svg{width:15px;height:15px;transition:transform .15s}
    .ssa__go:hover,.ssa__go:focus-visible{background:var(--ssa-navy);border-color:var(--ssa-navy);outline:none}
    .ssa__go:hover svg,.ssa__go:focus-visible svg{transform:translateX(3px)}
    .ssa__go:focus-visible{box-shadow:0 0 0 3px #9ec9f2}

    .ssa__foot{flex:0 0 auto;padding:14px 24px 18px;border-top:1px solid var(--ssa-line);font-size:13px;color:var(--ssa-muted)}

    .ssa__skel{height:72px;border:1px solid var(--ssa-line);background:linear-gradient(90deg,#f3f5f7 25%,#e9edf1 37%,#f3f5f7 63%);
      background-size:400% 100%;animation:ssa-shimmer 1.3s ease infinite}
    @keyframes ssa-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
    .ssa__error{padding:18px;border:1px solid var(--ssa-line);border-left:4px solid var(--ssa-low);font-size:15px}
    .ssa__retry{margin-top:12px;height:40px;padding:0 16px;border:1px solid var(--ssa-blue);background:#fff;color:var(--ssa-blue);
      font:inherit;font-size:13px;font-weight:700;cursor:pointer}
    .ssa__retry:hover,.ssa__retry:focus-visible{background:var(--ssa-blue);color:#fff;outline:none}

    html.ssa-lock,html.ssa-lock body{overflow:hidden!important}
    @media (max-width:480px){
      .ssa__head{padding:18px 56px 16px 18px}.ssa__title{font-size:19px}
      .ssa__body{padding:14px 16px 8px}.ssa__foot{padding:12px 16px 16px}
      .ssa__item{gap:4px 12px;min-height:68px;padding:12px 12px 12px 14px}
      .ssa__city{font-size:15px}
      .ssa__note{display:none}
      .ssa__go{height:38px;padding:0 10px 0 12px}
    }
    @media (prefers-reduced-motion:reduce){.ssa__panel,.ssa__backdrop{transition:none}.ssa__skel{animation:none}}
  `;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'ssa-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', 'ssa-panel');
  trigger.textContent = 'Sprawdź dostępność w salonach';

  // W wierszu #projector_stocks link zastępuje tekst (ikona pinezki zostaje z szablonu).
  function mount() {
    const row = document.querySelector(ANCHOR);
    const info = row && row.querySelector('.projector_stocks__info');
    if (info) { info.replaceChildren(trigger); return true; }
    const target = row || document.querySelector(FALLBACK_ANCHOR);
    if (!target) return false;
    if (!trigger.classList.contains('--standalone')) {
      trigger.classList.add('--standalone');
      trigger.insertAdjacentHTML('afterbegin', ICON.pin);
    }
    target.insertAdjacentElement('afterend', trigger);
    return true;
  }

  const root = document.createElement('div');
  root.className = 'ssa';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<div class="ssa__backdrop" data-ssa-close></div>' +
    '<div class="ssa__panel" id="ssa-panel" role="dialog" aria-modal="true" aria-labelledby="ssa-title" tabindex="-1">' +
      '<div class="ssa__head">' +
        `<p class="ssa__eyebrow">${ICON.pin}Salony stacjonarne</p>` +
        '<h2 class="ssa__title" id="ssa-title">Dostępność w salonach</h2>' +
        '<p class="ssa__product"></p>' +
        `<button type="button" class="ssa__close" aria-label="Zamknij" data-ssa-close>${ICON.close}</button>` +
      '</div>' +
      '<div class="ssa__body" aria-live="polite"></div>' +
      '<p class="ssa__foot">Stany odświeżane co minutę. Przejście otwiera ten sam produkt w wybranym salonie.</p>' +
    '</div>';
  const panel = root.querySelector('.ssa__panel');
  const body = root.querySelector('.ssa__body');
  root.querySelector('.ssa__product').textContent = getProductName();

  let cache = null;
  let productId = null;
  let opener = null;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function showSkeleton(count) {
    const list = el('div', 'ssa__list');
    for (let i = 0; i < count; i++) list.append(el('div', 'ssa__skel'));
    body.replaceChildren(list);
  }

  function showError() {
    const box = el('div', 'ssa__error', 'Nie udało się pobrać stanów w salonach.');
    const retry = el('button', 'ssa__retry', 'Spróbuj ponownie');
    retry.type = 'button';
    retry.addEventListener('click', load);
    box.append(el('br'), retry);
    body.replaceChildren(box);
  }

  // Wybrany rozmiar liczy się tylko u towarów z rozmiarami; brak rozmiaru w salonie = brak.
  function bySize(salon, size) {
    return Boolean(size && size !== 'uniw' && salon.sizes && Object.keys(salon.sizes).some((k) => k !== 'uniw'));
  }

  function salonState(salon, data, size) {
    const useSize = bySize(salon, size);
    if (data.display === 'exact') {
      const qty = useSize ? salon.sizes[size] ?? 0 : salon.total;
      const level = qty <= 0 ? 'none' : qty <= (data.lowStockThreshold || 5) ? 'low' : 'available';
      return { level, qty: qty > 0 ? `${qty} szt.` : 'Brak', note: level === 'low' ? 'ostatnie sztuki' : level === 'none' ? 'w tym salonie' : 'dostępne od ręki' };
    }
    const level = useSize ? salon.sizes[size] ?? 'none' : salon.level;
    return { level, qty: LEVEL_TEXT[level] || LEVEL_TEXT.none, note: '' };
  }

  function productUrl(salon, template) {
    const url = new URL(`https://${salon.domain}${template ? template.replace('{id}', productId) : location.pathname}`);
    url.searchParams.set('oddzial', salon.id);
    return url.toString();
  }

  function render(data) {
    const size = getSelectedSize();
    const rows = data.salons
      .map((s) => ({ ...s, ...salonState(s, data, size), here: normalizeHost(s.domain) === currentHost }))
      .sort((a, b) => (b.here - a.here) || (LEVEL_RANK[b.level] - LEVEL_RANK[a.level]) || a.name.localeCompare(b.name, 'pl'));

    const inStock = rows.filter((r) => r.level !== 'none').length;
    const summary = el('p', 'ssa__summary');
    summary.append('Dostępny w ', el('b', '', `${inStock} z ${rows.length}`), ' salonów');

    const list = el('ul', 'ssa__list');
    for (const r of rows) {
      const li = el('li', `ssa__item --${r.level}${r.here ? ' --here' : ''}`);
      const pin = el('span', 'ssa__pin');
      pin.innerHTML = ICON.pin;
      const name = el('div', 'ssa__name');
      name.append(el('span', 'ssa__city', r.name));
      if (r.here) name.append(el('span', 'ssa__badge', 'Jesteś tutaj'));
      const stock = el('div', 'ssa__stock');
      stock.append(el('span', 'ssa__qty', r.qty));
      if (r.note) stock.append(el('span', 'ssa__note', r.note));
      li.append(pin, name, stock);
      if (!r.here && r.level !== 'none') {
        const go = el('a', 'ssa__go');
        go.href = productUrl(r, data.linkTemplate);
        go.setAttribute('aria-label', `Przejdź do salonu ${r.name}`);
        go.append('Przejdź');
        go.insertAdjacentHTML('beforeend', ICON.arrow);
        li.append(go);
      }
      list.append(li);
    }
    body.replaceChildren(summary, list);
  }

  async function load() {
    showSkeleton(cache ? cache.salons.length : 5);
    try {
      const r = await fetch(`${API}?productId=${encodeURIComponent(productId)}`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(String(r.status));
      cache = await r.json();
      render(cache);
    } catch {
      showError();
    }
  }

  function open() {
    opener = document.activeElement;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('ssa-lock');
    setTimeout(() => panel.focus(), 30);
    if (cache) render(cache); else load();
  }

  function close() {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('ssa-lock');
    if (opener && opener.focus && document.contains(opener)) opener.focus();
  }

  trigger.addEventListener('click', open);
  root.addEventListener('click', (e) => { if (e.target.closest('[data-ssa-close]')) close(); });
  document.addEventListener('keydown', (e) => {
    if (!root.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      const f = panel.querySelectorAll('button,a[href]');
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function init() {
    productId = getProductId();
    if (!productId || !mount()) return;
    document.head.appendChild(style);
    document.body.appendChild(root);
    // Szablon przerysowuje części karty (np. po zmianie rozmiaru) – wtedy link wraca na miejsce.
    const form = document.querySelector('#projector_form') || document.body;
    new MutationObserver(() => { if (!trigger.isConnected) mount(); }).observe(form, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
