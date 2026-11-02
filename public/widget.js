/* Stany w salonach – widget karty towaru IdoSell.
   Osadzenie (Sklep > Dodatki HTML/JS, typ HTML, Karta towaru):
   <script src="https://<projekt>.vercel.app/widget.js" defer></script>
   data-anchor  – selektor miejsca na przycisk (domyślnie #projector_stocks, czyli wiersz
                  „Ten produkt nie jest dostępny w sklepie stacjonarnym”; gdy go brak – za #projector_form)
   data-accent  – kolor akcentu (domyślnie #1d4ed8)
   data-api     – adres endpointu (domyślnie /api/stock na domenie skryptu) */
(() => {
  const script = document.currentScript;
  if (!script) return;

  const API = script.dataset.api || new URL('/api/stock', script.src).href;
  const ANCHOR = script.dataset.anchor || '#projector_stocks';
  const FALLBACK_ANCHOR = '#projector_form';
  const ACCENT = script.dataset.accent || '#1d4ed8';

  const LEVEL_TEXT = { available: 'Dostępny', low: 'Ostatnie sztuki', none: 'Brak w salonie' };
  const LEVEL_RANK = { available: 2, low: 1, none: 0 };

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

  const style = document.createElement('style');
  style.textContent = `
    .ssa-trigger{display:inline-flex;align-items:center;gap:.5em;margin:.75em 0;padding:0;border:0;background:none;
      font:inherit;color:${ACCENT};text-decoration:underline;text-underline-offset:.2em;cursor:pointer}
    .ssa-trigger:focus-visible,.ssa-dialog button:focus-visible,.ssa-dialog a:focus-visible{outline:2px solid ${ACCENT};outline-offset:2px}
    .ssa-trigger svg{flex:none}
    .ssa-trigger.--inline{margin:0;color:inherit}
    .ssa-dialog{width:min(28rem,calc(100vw - 2rem));padding:0;border:0;border-radius:12px;color:#1a1a1a;background:#fff;font:inherit}
    .ssa-dialog::backdrop{background:rgba(20,20,20,.45)}
    .ssa-head{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid #e6e6e6}
    .ssa-head h2{margin:0;font-size:1.125rem;font-weight:700}
    .ssa-close{border:0;background:none;font-size:1.5rem;line-height:1;cursor:pointer;color:inherit;padding:.25rem .5rem}
    .ssa-body{padding:.5rem 1.25rem 1.25rem}
    .ssa-list{list-style:none;margin:0;padding:0}
    .ssa-row{display:grid;grid-template-columns:auto 1fr auto;gap:.25rem .75rem;align-items:center;padding:.85rem 0;border-bottom:1px solid #f0f0f0}
    .ssa-row:last-child{border-bottom:0}
    .ssa-dot{width:.7rem;height:.7rem;border-radius:50%}
    .ssa-dot[data-level=available]{background:#3fa535}
    .ssa-dot[data-level=low]{background:#e0a100}
    .ssa-dot[data-level=none]{background:#c4c4c4}
    .ssa-name{font-weight:600}
    .ssa-here{font-weight:400;color:#666}
    .ssa-status{grid-column:2;font-size:.9em;color:#444}
    .ssa-go{grid-row:1 / span 2;grid-column:3;padding:.5rem .85rem;border-radius:6px;background:${ACCENT};color:#fff;
      text-decoration:none;font-size:.9em;font-weight:600;white-space:nowrap}
    .ssa-msg{margin:.75rem 0 0;color:#444}
    .ssa-retry{margin-top:.75rem;padding:.5rem .85rem;border:1px solid ${ACCENT};border-radius:6px;background:#fff;color:${ACCENT};font:inherit;cursor:pointer}
    @media (max-width:420px){.ssa-row{grid-template-columns:auto 1fr}.ssa-go{grid-row:auto;grid-column:2;justify-self:start;margin-top:.35rem}}
  `;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'ssa-trigger';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.textContent = 'Sprawdź dostępność w salonach';
  const PIN_ICON =
    '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>';

  // W wierszu #projector_stocks przycisk zastępuje tekst (ikona pinezki zostaje z szablonu).
  // Bez tego wiersza przycisk z własną ikoną trafia za formularz.
  function mount() {
    const row = document.querySelector(ANCHOR);
    const info = row && row.querySelector('.projector_stocks__info');
    if (info) {
      trigger.classList.add('--inline');
      info.replaceChildren(trigger);
      return true;
    }
    const target = row || document.querySelector(FALLBACK_ANCHOR);
    if (!target) return false;
    if (!trigger.querySelector('svg')) trigger.insertAdjacentHTML('afterbegin', PIN_ICON);
    target.insertAdjacentElement('afterend', trigger);
    return true;
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'ssa-dialog';
  dialog.setAttribute('aria-labelledby', 'ssa-title');
  const head = document.createElement('div');
  head.className = 'ssa-head';
  const title = document.createElement('h2');
  title.id = 'ssa-title';
  title.textContent = 'Dostępność w salonach';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'ssa-close';
  close.setAttribute('aria-label', 'Zamknij');
  close.textContent = '×';
  close.addEventListener('click', () => dialog.close());
  head.append(title, close);
  const body = document.createElement('div');
  body.className = 'ssa-body';
  body.setAttribute('aria-live', 'polite');
  dialog.append(head, body);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  let cache = null;
  let productId = null;

  function message(text, withRetry) {
    body.replaceChildren();
    const p = document.createElement('p');
    p.className = 'ssa-msg';
    p.textContent = text;
    body.append(p);
    if (withRetry) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'ssa-retry';
      retry.textContent = 'Spróbuj ponownie';
      retry.addEventListener('click', load);
      body.append(retry);
    }
  }

  function levelFromQty(q) { return q > 0 ? 'available' : 'none'; }

  // Wybrany rozmiar liczy się tylko u towarów z rozmiarami; brak rozmiaru w salonie = brak.
  function bySize(salon, size) {
    return Boolean(size && size !== 'uniw' && salon.sizes && Object.keys(salon.sizes).some((k) => k !== 'uniw'));
  }

  function salonState(salon, display, size) {
    const useSize = bySize(salon, size);
    if (display === 'exact') {
      const qty = useSize ? salon.sizes[size] ?? 0 : salon.total;
      return { level: levelFromQty(qty), text: qty > 0 ? `${qty} szt.` : LEVEL_TEXT.none };
    }
    const lvl = useSize ? salon.sizes[size] ?? 'none' : salon.level;
    return { level: lvl, text: LEVEL_TEXT[lvl] || LEVEL_TEXT.none };
  }

  function productUrl(domain, template) {
    const path = template ? template.replace('{id}', productId) : location.pathname;
    return `https://${domain}${path}`;
  }

  function render(data) {
    const size = getSelectedSize();
    const rows = data.salons.map((s) => ({ ...s, ...salonState(s, data.display, size), here: normalizeHost(s.domain) === currentHost }));
    rows.sort((a, b) => (b.here - a.here) || (LEVEL_RANK[b.level] - LEVEL_RANK[a.level]) || a.name.localeCompare(b.name, 'pl'));

    const list = document.createElement('ul');
    list.className = 'ssa-list';
    for (const r of rows) {
      const li = document.createElement('li');
      li.className = 'ssa-row';
      const dot = document.createElement('span');
      dot.className = 'ssa-dot';
      dot.dataset.level = r.level;
      const name = document.createElement('span');
      name.className = 'ssa-name';
      name.textContent = r.name;
      if (r.here) {
        const here = document.createElement('span');
        here.className = 'ssa-here';
        here.textContent = ' (jesteś tutaj)';
        name.append(here);
      }
      const status = document.createElement('span');
      status.className = 'ssa-status';
      status.textContent = r.text;
      li.append(dot, name);
      if (!r.here && r.level !== 'none') {
        const go = document.createElement('a');
        go.className = 'ssa-go';
        go.href = productUrl(r.domain, data.linkTemplate);
        go.textContent = `Przejdź do salonu ${r.name}`;
        li.append(go);
      }
      li.append(status);
      list.append(li);
    }
    body.replaceChildren(list);
  }

  async function load() {
    message('Sprawdzam stany w salonach…', false);
    try {
      const r = await fetch(`${API}?productId=${encodeURIComponent(productId)}`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(String(r.status));
      cache = await r.json();
      render(cache);
    } catch {
      message('Nie udało się pobrać stanów w salonach.', true);
    }
  }

  trigger.addEventListener('click', () => {
    dialog.showModal();
    if (cache) render(cache); else load();
  });

  function init() {
    productId = getProductId();
    if (!productId || !mount()) return;
    document.head.appendChild(style);
    document.body.appendChild(dialog);
    // Szablon przerysowuje części karty (np. po zmianie rozmiaru) – wtedy przycisk wraca na miejsce.
    const form = document.querySelector('#projector_form') || document.body;
    new MutationObserver(() => { if (!trigger.isConnected) mount(); }).observe(form, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
