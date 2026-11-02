/* Stany w salonach – widget IdoSell (karta towaru + koszyk).
   Osadzenie (Sklep > Dodatki HTML/JS, typ HTML, podstrony: Karta towaru i Koszyk):
   <script src="https://<projekt>.vercel.app/widget.js" defer></script>
   data-api – adres endpointu (domyślnie /api/stock na domenie skryptu) */
(() => {
  const script = document.currentScript;
  if (!script || window.__ssaWidget) return;
  window.__ssaWidget = true;

  const API = script.dataset.api || new URL('/api/stock', script.src).href;
  const GQL = '/graphql/v1/';
  const BASKET_QUERY = JSON.stringify({ query: 'query { basket(BasketCostInput: {}) { products { id quantity size forPoints data { name } } } }' });

  const LEVEL_TEXT = { available: 'Dostępny', low: 'Ostatnie sztuki', none: 'Brak' };
  const LEVEL_RANK = { available: 2, low: 1, none: 0 };

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    part: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>',
    no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  };

  const normalizeHost = (h) => String(h || '').toLowerCase().replace(/^www\./, '');
  const currentHost = normalizeHost(location.hostname);

  /* ---------- rozpoznanie strony ---------- */
  function getProductId() {
    const form = document.querySelector('#projector_form');
    const candidates = [
      form && form.dataset.product_id,
      (document.querySelector('#projector_form [name="product"]') || {}).value,
    ];
    return candidates.find((v) => /^\d+$/.test(v || '')) || null;
  }
  const isBasket = () => Boolean(document.querySelector('#Basket .basket__block.--product, .basketedit_page #Basket'));

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

  async function getBasket() {
    const r = await fetch(GQL, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: BASKET_QUERY });
    const j = await r.json();
    const items = (j && j.data && j.data.basket && j.data.basket.products) || [];
    return items
      .filter((p) => !p.forPoints && /^\d+$/.test(String(p.id)))
      .map((p) => ({ id: String(p.id), size: String(p.size || 'uniw'), qty: Number(p.quantity) || 0, name: (p.data && p.data.name) || 'Produkt' }));
  }

  /* ---------- style (kolory i krój z dodatku „Twój oddział”) ---------- */
  const style = document.createElement('style');
  style.textContent = `
    .ssa-trigger{display:inline;padding:0;margin:0;border:0;background:none;font:inherit;color:inherit;
      text-decoration:underline;text-underline-offset:.2em;cursor:pointer;text-align:left}
    .ssa-trigger:hover{color:#0066b3}
    .ssa-trigger:focus-visible{outline:2px solid #0066b3;outline-offset:2px}
    .ssa-row-icon{display:inline-flex;align-items:center;justify-content:center}
    .ssa-row-icon svg{width:18px;height:18px}

    .ssa-cta{box-sizing:border-box;display:grid;grid-template-columns:22px 1fr;align-items:center;gap:6px 14px;width:100%;margin:0 0 16px;padding:16px 18px;
      background:#f5f9fd;border:1px solid #d6e4f2;border-left:4px solid #0066b3;font-family:Lato,"Segoe UI",Arial,sans-serif;color:#2f3337}
    .ssa-cta *{box-sizing:border-box;margin:0}
    .ssa-cta__pin{grid-row:1 / span 2;align-self:start;width:22px;height:22px;margin-top:1px;color:#0066b3}
    .ssa-cta__title{font-size:15px;font-weight:700;line-height:1.3}
    .ssa-cta__text{grid-column:2;font-size:13px;line-height:1.4;color:#6b7280}
    .ssa-cta__btn{grid-column:2;justify-self:start;display:inline-flex;align-items:center;gap:6px;height:38px;margin-top:6px;padding:0 14px 0 16px;
      border:1px solid #0066b3;background:#0066b3;color:#fff;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:background-color .15s,border-color .15s}
    .ssa-cta__btn svg{width:15px;height:15px;transition:transform .15s}
    .ssa-cta__btn:hover,.ssa-cta__btn:focus-visible{background:#0d1f38;border-color:#0d1f38;outline:none}
    .ssa-cta__btn:hover svg{transform:translateX(3px)}
    .ssa-cta__btn:focus-visible{box-shadow:0 0 0 3px #9ec9f2}

    .ssa{--ssa-navy:#0d1f38;--ssa-blue:#0066b3;--ssa-blue-soft:#f5f9fd;--ssa-line:#e6e8eb;--ssa-text:#2f3337;--ssa-muted:#6b7280;
      --ssa-ok:#1f8a3b;--ssa-low:#d97706;--ssa-none:#b8bec6;
      position:fixed;inset:0;z-index:2147483000;visibility:hidden;pointer-events:none;
      font-family:Lato,"Segoe UI",Arial,sans-serif;font-size:15px;line-height:1.4;color:var(--ssa-text);text-align:left}
    .ssa *,.ssa *::before,.ssa *::after{box-sizing:border-box;margin:0}
    .ssa.is-open{visibility:visible;pointer-events:auto}
    .ssa__backdrop{position:absolute;inset:0;background:rgba(8,15,28,.55);opacity:0;transition:opacity .22s}
    .ssa.is-open .ssa__backdrop{opacity:1}
    .ssa__panel{position:absolute;top:0;right:0;bottom:0;width:min(460px,100vw);display:flex;flex-direction:column;background:#fff;
      box-shadow:-18px 0 48px rgba(0,0,0,.22);transform:translateX(100%);transition:transform .26s cubic-bezier(.2,.8,.2,1);outline:none}
    .ssa.is-open .ssa__panel{transform:none}

    .ssa__head{position:relative;flex:0 0 auto;padding:22px 64px 20px 24px;background:var(--ssa-navy);color:#fff;border-bottom:4px solid var(--ssa-blue)}
    .ssa__eyebrow{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9ec9f2}
    .ssa__eyebrow svg{width:15px;height:15px;color:#5aa9f0}
    .ssa__title{margin-top:6px;font-size:22px;line-height:1.25;font-weight:700;color:#fff}
    .ssa__sub{margin-top:6px;font-size:14px;color:#cfd8e3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .ssa__close{position:absolute;top:14px;right:14px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;padding:0;
      border:0;border-radius:50%;background:transparent;color:#cfd8e3;cursor:pointer;transition:background-color .15s,color .15s}
    .ssa__close:hover,.ssa__close:focus-visible{background:rgba(255,255,255,.12);color:#fff;outline:none}
    .ssa__close svg{width:20px;height:20px}

    .ssa__body{flex:1 1 auto;overflow-y:auto;padding:18px 24px 12px;overscroll-behavior:contain}
    .ssa__summary{margin-bottom:14px;font-size:14px;color:var(--ssa-muted)}
    .ssa__summary b{color:var(--ssa-text)}
    .ssa__list{list-style:none;padding:0;display:grid;gap:8px}

    .ssa__item{display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:4px 14px;min-height:72px;padding:14px 16px;
      border:1px solid var(--ssa-line);background:#fff}
    .ssa__item.--here{border-color:var(--ssa-blue);background:var(--ssa-blue-soft);box-shadow:inset 4px 0 0 var(--ssa-blue)}
    .ssa__item.--none .ssa__city{color:var(--ssa-muted)}
    .ssa__pin{grid-row:1 / span 2;grid-column:1;width:20px;height:20px;color:var(--ssa-blue)}
    .ssa__item.--none .ssa__pin{color:var(--ssa-none)}
    .ssa__name{grid-column:2;display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;min-width:0}
    .ssa__city{font-size:16px;font-weight:700}
    .ssa__badge{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;line-height:1.2;padding:3px 8px;background:var(--ssa-blue);color:#fff}
    .ssa__stock{grid-column:2;display:flex;align-items:baseline;flex-wrap:wrap;gap:2px 8px;font-size:14px;color:var(--ssa-muted)}
    .ssa__qty{display:inline-flex;align-items:center;gap:7px;font-weight:700;color:var(--ssa-text)}
    .ssa__qty::before{content:"";width:9px;height:9px;border-radius:50%;background:var(--ssa-ok)}
    .ssa__item.--low .ssa__qty::before{background:var(--ssa-low)}
    .ssa__item.--none .ssa__qty{color:var(--ssa-muted);font-weight:400}
    .ssa__item.--none .ssa__qty::before{background:var(--ssa-none)}
    .ssa__note{font-size:13px}
    .ssa__item.--low .ssa__note{color:var(--ssa-low);font-weight:700}

    .ssa__go{grid-row:1 / span 2;grid-column:3;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 14px 0 16px;
      background:var(--ssa-blue);border:1px solid var(--ssa-blue);color:#fff!important;text-decoration:none!important;
      font:inherit;font-size:13px;font-weight:700;letter-spacing:.02em;white-space:nowrap;cursor:pointer;transition:background-color .15s,border-color .15s}
    .ssa__go svg{width:15px;height:15px;transition:transform .15s}
    .ssa__go:hover,.ssa__go:focus-visible{background:var(--ssa-navy);border-color:var(--ssa-navy);outline:none}
    .ssa__go:hover svg,.ssa__go:focus-visible svg{transform:translateX(3px)}
    .ssa__go:focus-visible{box-shadow:0 0 0 3px #9ec9f2}

    .ssa__toggle{grid-column:2 / -1;justify-self:start;display:inline-flex;align-items:center;gap:5px;margin-top:4px;padding:0;border:0;background:none;
      color:var(--ssa-blue);font:inherit;font-size:13px;font-weight:700;cursor:pointer}
    .ssa__toggle svg{width:14px;height:14px;transition:transform .15s}
    .ssa__toggle[aria-expanded="true"] svg{transform:rotate(180deg)}
    .ssa__toggle:focus-visible{outline:2px solid var(--ssa-blue);outline-offset:2px}
    .ssa__lines{grid-column:2 / -1;list-style:none;padding:8px 0 2px;display:grid;gap:6px;border-top:1px dashed var(--ssa-line);margin-top:6px}
    .ssa__lines[hidden]{display:none}
    .ssa__line{display:grid;grid-template-columns:16px 1fr auto;align-items:center;gap:8px;font-size:13px}
    .ssa__line svg{width:16px;height:16px}
    .ssa__line.--ok svg{color:var(--ssa-ok)}
    .ssa__line.--part svg{color:var(--ssa-low)}
    .ssa__line.--no svg{color:#c2410c}
    .ssa__line-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .ssa__line-qty{font-weight:700;white-space:nowrap}
    .ssa__line.--no .ssa__line-qty{color:var(--ssa-muted);font-weight:400}

    .ssa__foot{flex:0 0 auto;padding:14px 24px 18px;border-top:1px solid var(--ssa-line);font-size:13px;color:var(--ssa-muted)}

    .ssa__skel{height:72px;border:1px solid var(--ssa-line);background:linear-gradient(90deg,#f3f5f7 25%,#e9edf1 37%,#f3f5f7 63%);
      background-size:400% 100%;animation:ssa-shimmer 1.3s ease infinite}
    @keyframes ssa-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
    .ssa__error{padding:18px;border:1px solid var(--ssa-line);border-left:4px solid var(--ssa-low);font-size:15px}
    .ssa__retry{display:block;margin-top:12px;height:40px;padding:0 16px;border:1px solid var(--ssa-blue);background:#fff;color:var(--ssa-blue);
      font:inherit;font-size:13px;font-weight:700;cursor:pointer}
    .ssa__retry:hover,.ssa__retry:focus-visible{background:var(--ssa-blue);color:#fff;outline:none}

    html.ssa-lock,html.ssa-lock body{overflow:hidden!important}
    @media (max-width:480px){
      .ssa__head{padding:18px 56px 16px 18px}.ssa__title{font-size:19px}
      .ssa__body{padding:14px 16px 8px}.ssa__foot{padding:12px 16px 16px}
      .ssa__item{gap:4px 12px;min-height:68px;padding:12px 12px 12px 14px}
      .ssa__city{font-size:15px}
      .ssa__go{height:38px;padding:0 10px 0 12px}
      .ssa-cta{padding:14px}
    }
    @media (prefers-reduced-motion:reduce){.ssa__panel,.ssa__backdrop{transition:none}.ssa__skel{animation:none}}
  `;

  /* ---------- helpery DOM ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function icon(name, cls) {
    const s = el('span', cls);
    s.innerHTML = ICON[name];
    return s;
  }

  /* ---------- panel ---------- */
  const root = el('div', 'ssa');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML =
    '<div class="ssa__backdrop" data-ssa-close></div>' +
    '<div class="ssa__panel" id="ssa-panel" role="dialog" aria-modal="true" aria-labelledby="ssa-title" tabindex="-1">' +
      '<div class="ssa__head">' +
        `<p class="ssa__eyebrow">${ICON.pin}Salony stacjonarne</p>` +
        '<h2 class="ssa__title" id="ssa-title"></h2>' +
        '<p class="ssa__sub"></p>' +
        `<button type="button" class="ssa__close" aria-label="Zamknij" data-ssa-close>${ICON.close}</button>` +
      '</div>' +
      '<div class="ssa__body" aria-live="polite"></div>' +
      '<p class="ssa__foot"></p>' +
    '</div>';
  const panel = root.querySelector('.ssa__panel');
  const body = root.querySelector('.ssa__body');
  const setHead = (title, sub, foot) => {
    root.querySelector('.ssa__title').textContent = title;
    root.querySelector('.ssa__sub').textContent = sub;
    root.querySelector('.ssa__foot').textContent = foot;
  };

  let opener = null;
  let loader = null;

  function showSkeleton(count) {
    const list = el('div', 'ssa__list');
    for (let i = 0; i < count; i++) list.append(el('div', 'ssa__skel'));
    body.replaceChildren(list);
  }

  function showMessage(text, retry) {
    const box = el('div', 'ssa__error', text);
    if (retry) {
      const b = el('button', 'ssa__retry', 'Spróbuj ponownie');
      b.type = 'button';
      b.addEventListener('click', () => loader && loader());
      box.append(b);
    }
    body.replaceChildren(box);
  }

  function open(load) {
    opener = document.activeElement;
    loader = load;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('ssa-lock');
    setTimeout(() => panel.focus(), 30);
    load();
  }

  function close() {
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('ssa-lock');
    if (opener && opener.focus && document.contains(opener)) opener.focus();
  }

  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-ssa-close]')) { close(); return; }
    const toggle = e.target.closest('.ssa__toggle');
    if (toggle) {
      const lines = document.getElementById(toggle.getAttribute('aria-controls'));
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.firstChild.textContent = expanded ? 'Pokaż produkty' : 'Ukryj produkty';
      if (lines) lines.hidden = expanded;
      return;
    }
    // Przejście do salonu przez dodatek przenoszenia koszyka (reaguje na a.swr-om__link);
    // bez tego dodatku zwykłe przejście pod adres salonu.
    const go = e.target.closest('a.ssa__go');
    if (go && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const proxy = el('a', 'swr-om__link');
      proxy.href = go.href;
      proxy.hidden = true;
      document.body.append(proxy);
      proxy.click();
      setTimeout(() => proxy.remove(), 1000);
    }
  });

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

  /* ---------- dane ---------- */
  async function fetchStocks(ids) {
    const url = `${API}?productIds=${ids.map(encodeURIComponent).join(',')}&shop=${encodeURIComponent(currentHost)}`;
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }

  // Ilość / poziom dla salonu i rozmiaru; brak rozmiaru w salonie = 0.
  function stockFor(entry, size, data) {
    if (!entry) return data.display === 'exact' ? { qty: 0, level: 'none' } : { qty: null, level: 'none' };
    const hasSizes = entry.sizes && Object.keys(entry.sizes).some((k) => k !== 'uniw');
    const useSize = Boolean(size && size !== 'uniw' && hasSizes);
    if (data.display === 'exact') {
      const qty = useSize ? entry.sizes[size] ?? 0 : entry.total;
      const level = qty <= 0 ? 'none' : qty <= (data.lowStockThreshold || 5) ? 'low' : 'available';
      return { qty, level };
    }
    return { qty: null, level: useSize ? entry.sizes[size] ?? 'none' : entry.level };
  }

  function salonUrl(salon, path) {
    const url = new URL(`https://${salon.domain}${path}`);
    url.searchParams.set('oddzial', salon.id);
    return url.toString();
  }

  function salonCard(salon, here, levelClass) {
    const li = el('li', `ssa__item --${levelClass}${here ? ' --here' : ''}`);
    const name = el('div', 'ssa__name');
    name.append(el('span', 'ssa__city', salon.name));
    if (here) name.append(el('span', 'ssa__badge', 'Jesteś tutaj'));
    li.append(icon('pin', 'ssa__pin'), name);
    return li;
  }

  function goButton(href, label, ariaName) {
    const go = el('a', 'ssa__go');
    go.href = href;
    go.setAttribute('aria-label', `${label} do salonu ${ariaName}`);
    go.append(label);
    go.insertAdjacentHTML('beforeend', ICON.arrow);
    return go;
  }

  const sortSalons = (a, b) => (b.here - a.here) || (b.rank - a.rank) || a.name.localeCompare(b.name, 'pl');

  /* ---------- karta towaru ---------- */
  function renderProduct(data, productId) {
    const size = getSelectedSize();
    const rows = data.salons.map((s) => {
      const st = stockFor((data.products[productId] || {})[s.id], size, data);
      return { ...s, ...st, here: normalizeHost(s.domain) === currentHost, rank: data.display === 'exact' ? st.qty : LEVEL_RANK[st.level] };
    }).sort(sortSalons);

    const inStock = rows.filter((r) => r.level !== 'none').length;
    const summary = el('p', 'ssa__summary');
    summary.append('Dostępny w ', el('b', '', `${inStock} z ${rows.length}`), ' salonów');

    const list = el('ul', 'ssa__list');
    for (const r of rows) {
      const li = salonCard(r, r.here, r.level);
      const stock = el('div', 'ssa__stock');
      if (data.display === 'exact') {
        stock.append(el('span', 'ssa__qty', r.qty > 0 ? `${r.qty} szt.` : 'Brak'));
        stock.append(el('span', 'ssa__note', r.level === 'low' ? 'ostatnie sztuki' : r.level === 'none' ? 'w tym salonie' : 'dostępne od ręki'));
      } else {
        stock.append(el('span', 'ssa__qty', LEVEL_TEXT[r.level]));
      }
      li.append(stock);
      if (!r.here && r.level !== 'none') li.append(goButton(salonUrl(r, data.linkTemplate ? data.linkTemplate.replace('{id}', productId) : location.pathname), 'Przejdź', r.name));
      list.append(li);
    }
    body.replaceChildren(summary, list);
  }

  function mountProduct(productId) {
    const trigger = el('button', 'ssa-trigger', 'Sprawdź dostępność w salonach');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog');
    let cache = null;

    const load = async () => {
      setHead('Dostępność w salonach', getProductName(), 'Stany odświeżane co minutę. Przejście otwiera ten sam produkt w wybranym salonie.');
      if (cache) { renderProduct(cache, productId); return; }
      showSkeleton(5);
      try { cache = await fetchStocks([productId]); renderProduct(cache, productId); }
      catch { showMessage('Nie udało się pobrać stanów w salonach.', true); }
    };
    trigger.addEventListener('click', () => open(load));

    // 1) wiersz szablonu „sklep stacjonarny” → link zamiast tekstu,
    // 2) lista informacji pod przyciskami → nowy wiersz w tym samym stylu,
    // 3) awaryjnie za formularzem.
    function place() {
      const info = document.querySelector('#projector_stocks .projector_stocks__info');
      if (info) { info.replaceChildren(trigger); return true; }
      const section = document.querySelector('#projector_additional_section, #projector_form .projector_info');
      if (section) {
        const row = el('div', 'projector_info__item --stocks ssa-row');
        row.append(icon('pin', 'projector_info__icon ssa-row-icon'));
        const label = el('span', 'projector_info__link');
        label.append(trigger);
        row.append(label);
        const before = section.querySelector('#projector_safe, .projector_safe');
        section.insertBefore(row, before || null);
        return true;
      }
      const form = document.querySelector('#projector_form');
      if (!form) return false;
      form.insertAdjacentElement('afterend', trigger);
      return true;
    }
    if (!place()) return false;
    const watch = document.querySelector('#projector_form') || document.body;
    new MutationObserver(() => { if (!trigger.isConnected) place(); }).observe(watch, { childList: true, subtree: true });
    return true;
  }

  /* ---------- koszyk ---------- */
  function renderBasket(data, items) {
    const rows = data.salons.map((s) => {
      const lines = items.map((it) => {
        const st = stockFor((data.products[it.id] || {})[s.id], it.size, data);
        const state = data.display === 'exact'
          ? (st.qty >= it.qty ? 'ok' : st.qty > 0 ? 'part' : 'no')
          : (st.level !== 'none' ? 'ok' : 'no');
        return { name: it.name, need: it.qty, have: st.qty, level: st.level, state };
      });
      const ok = lines.filter((l) => l.state === 'ok').length;
      const any = lines.filter((l) => l.state !== 'no').length;
      const level = ok === lines.length ? 'available' : any > 0 ? 'low' : 'none';
      return { ...s, lines, ok, any, level, here: normalizeHost(s.domain) === currentHost, rank: ok * 1000 + any };
    }).sort(sortSalons);

    const full = rows.filter((r) => r.level === 'available').length;
    const summary = el('p', 'ssa__summary');
    summary.append('Cały koszyk dostępny w ', el('b', '', `${full} z ${rows.length}`), ' salonów');

    const list = el('ul', 'ssa__list');
    rows.forEach((r, idx) => {
      const li = salonCard(r, r.here, r.level);
      const stock = el('div', 'ssa__stock');
      const label = r.level === 'available' ? 'Cały koszyk dostępny'
        : r.level === 'low' ? `Dostępne ${r.ok} z ${r.lines.length} produktów` : 'Brak produktów z koszyka';
      stock.append(el('span', 'ssa__qty', label));
      if (r.level === 'low' && r.any > r.ok) stock.append(el('span', 'ssa__note', 'część w mniejszej ilości'));
      li.append(stock);
      if (!r.here && r.level !== 'none') li.append(goButton(salonUrl(r, '/'), 'Przejdź', `${r.name}, z koszykiem`));

      const id = `ssa-lines-${idx}`;
      const toggle = el('button', 'ssa__toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', id);
      toggle.append(document.createTextNode('Pokaż produkty'));
      toggle.insertAdjacentHTML('beforeend', ICON.down);
      const ul = el('ul', 'ssa__lines');
      ul.id = id;
      ul.hidden = true;
      for (const l of r.lines) {
        const line = el('li', `ssa__line --${l.state}`);
        const text = data.display === 'exact' ? `${Math.max(0, l.have)} / ${l.need} szt.` : LEVEL_TEXT[l.level].toLowerCase();
        line.append(icon(l.state === 'ok' ? 'ok' : l.state), el('span', 'ssa__line-name', l.name), el('span', 'ssa__line-qty', text));
        line.title = l.name;
        ul.append(line);
      }
      li.append(toggle, ul);
      list.append(li);
    });
    body.replaceChildren(summary, list);
  }

  function mountBasket() {
    const cta = el('div', 'ssa-cta');
    cta.append(icon('pin', 'ssa-cta__pin'), el('p', 'ssa-cta__title', 'Odbierz w salonie'),
      el('p', 'ssa-cta__text', 'Sprawdź, w którym salonie dostępny jest cały Twój koszyk.'));
    const btn = el('button', 'ssa-cta__btn', 'Sprawdź dostępność');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.insertAdjacentHTML('beforeend', ICON.arrow);
    cta.append(btn);

    const load = async () => {
      showSkeleton(5);
      try {
        const items = await getBasket();
        const n = items.length;
        setHead('Dostępność koszyka', `Twój koszyk: ${n} ${n === 1 ? 'produkt' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'produkty' : 'produktów'}`,
          'Stany odświeżane co minutę. Przejście przenosi koszyk do wybranego salonu.');
        if (!n) { showMessage('Koszyk jest pusty.', false); return; }
        const data = await fetchStocks([...new Set(items.map((i) => i.id))].slice(0, 30));
        renderBasket(data, items);
      } catch {
        showMessage('Nie udało się pobrać stanów w salonach.', true);
      }
    };
    btn.addEventListener('click', () => { setHead('Dostępność koszyka', '', ''); open(load); });

    // Nad przyciskiem „Przejdź do kasy” w podsumowaniu; awaryjnie pod listą produktów.
    function place() {
      const buttons = document.querySelector('.cop_summary .cop_summary__item.--buttons');
      if (buttons) { buttons.parentNode.insertBefore(cta, buttons); return true; }
      const tools = document.querySelector('#Basket .basket__tools');
      if (tools) { tools.insertAdjacentElement('afterend', cta); return true; }
      const basket = document.querySelector('#Basket');
      if (!basket) return false;
      basket.prepend(cta);
      return true;
    }
    if (!place()) return false;
    const watch = document.querySelector('#container') || document.body;
    new MutationObserver(() => { if (!cta.isConnected) place(); }).observe(watch, { childList: true, subtree: true });
    return true;
  }

  /* ---------- start ---------- */
  function init() {
    const productId = getProductId();
    const mounted = productId ? mountProduct(productId) : isBasket() ? mountBasket() : false;
    if (!mounted) return;
    document.head.appendChild(style);
    document.body.appendChild(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
