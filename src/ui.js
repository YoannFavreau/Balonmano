/* =====================================================================
   ÉTAT D'INTERFACE & COMPOSANTS
   ===================================================================== */
const ui = {
  tab: 'today', more:false, wiz:null, dataTab:'force', sheet:null, modal:null, open:{},
  sess: null, progTab:'overview', progPhase:1, progKey:'A',
  calMode:'week', calRef: null, statsRange:'all', cmp:{ a:null, b:null }, chartEx:'squat',
  ci: null, ciDate: null, runOpen:false, editProg:false, setTab:'profil'
};
try { const s = JSON.parse(localStorage.getItem('hb-ui') || '{}'); if (s.tab) ui.tab = s.tab === 'dash' ? 'today' : s.tab; } catch (e) {}
const rememberUi = () => { try { localStorage.setItem('hb-ui', JSON.stringify({ tab: ui.tab })); } catch (e) {} };

const NAV = [
  ['today','Aujourd’hui','▶'], ['inbox','Questions','✎'], ['data','Mes données','↗'],
  ['cal','Calendrier','▤'], ['prog','Programme','▦'], ['sess','Toutes les séances','☰'], ['care','Blessures & récup','✚'], ['stats','Analyse complète','◔'], ['set','Paramètres','⚙']
];
const MAIN_NAV = ['today','inbox','data'];
const MOBILE_NAV = MAIN_NAV;

function syncBadge() {
  if (DEMO) return `<span class="chip bg-warn/15 text-warn">Mode démo · rien n’est enregistré</span>`;
  if (Sync.mode === 'github') { const g = { ok:['bg-good/15 text-good','☁ Synchronisé'], saving:['bg-blue/15 text-blue','⟳ Synchronisation…'], error:['bg-warn/15 text-warn','⚠ Synchro en erreur'], offline:['bg-ink-3 text-txt-2','Hors ligne · enregistré localement'] }[Sync.status] || ['bg-ink-3 text-txt-2','☁ GitHub'];
    return `<button data-a="goto-set" data-v="donnees" class="chip ${g[0]}">${g[1]}</button>`; }
  const m = { ok:['bg-good/15 text-good','☁ Synchronisé'], saving:['bg-blue/15 text-blue','⟳ Enregistrement…'], loading:['bg-blue/15 text-blue','⟳ Chargement…'],
    error:['bg-warn/15 text-warn','☁ Hors ligne · copie locale'], local:['bg-ink-3 text-txt-2','Sauvegarde locale'] }[Sync.status] || ['bg-ink-3 text-txt-2','Local'];
  return `<span class="chip ${m[0]}">${m[1]}</span>`;
}
function navHtml() {
  const nPend = pendingItems().length;
  const badge = k => k === 'inbox' && nPend ? `<span class="ml-auto min-w-[1.25rem] h-5 px-1 rounded-full bg-warn text-ink-0 text-[11px] font-bold grid place-items-center">${nPend}</span>` : '';
  const item = ([k,l,i], big) => `<button data-a="tab" data-v="${k}" class="w-full flex items-center gap-3 px-3 ${big ? 'py-3 text-[15px] font-semibold' : 'py-2 text-sm font-medium'} rounded-xl text-left ${ui.tab===k ? 'bg-ink-2 text-blue' : 'text-txt-2 hover:bg-ink-2 hover:text-txt-1'}"><span class="w-5 text-center" aria-hidden="true">${i}</span>${l}${badge(k)}</button>`;
  const side = NAV.filter(n => MAIN_NAV.includes(n[0])).map(n => item(n, true)).join('') + `<div class="px-3 pt-5 pb-1 text-[10px] uppercase tracking-widest text-txt-3">Plus</div>` + NAV.filter(n => !MAIN_NAV.includes(n[0])).map(n => item(n, false)).join('');
  const mob = MOBILE_NAV.map(k => { const [,l,i] = NAV.find(n => n[0]===k); return `<button data-a="tab" data-v="${k}" class="relative flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${ui.tab===k ? 'text-blue' : 'text-txt-3'}"><span class="text-lg leading-none" aria-hidden="true">${i}</span>${l}${k === 'inbox' && nPend ? `<span class="absolute top-1 left-1/2 ml-2 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-warn text-ink-0 text-[10px] font-bold grid place-items-center">${nPend}</span>` : ''}</button>`; }).join('');
  const moreActive = !MAIN_NAV.includes(ui.tab);
  return `<aside class="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col gap-1 p-4 border-r border-ink-3 bg-ink-0 z-30">
      <div class="px-3 pb-4"><div class="font-display text-2xl font-bold tracking-wide">CARNET<span class="text-good">.</span>HB</div>
      <div class="text-xs text-txt-3">Retour au handball · 16 semaines</div></div>${side}
      <div class="mt-auto px-3 space-y-2"><div id="sync">${syncBadge()}</div>
      <p class="text-[11px] text-txt-3 leading-relaxed">Outil de suivi et d’autorégulation. Il ne pose aucun diagnostic et ne remplace pas l’avis de ton kiné ou de ton médecin.</p></div></aside>
    <nav class="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-ink-1/95 backdrop-blur border-t border-ink-3 flex safe-b">${mob}
      <button data-a="more" class="flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${moreActive ? 'text-blue' : 'text-txt-3'}"><span class="text-lg leading-none">⋯</span>Plus</button></nav>
    ${ui.more ? `<div class="lg:hidden fixed inset-0 z-40" data-a="more"><div class="absolute inset-0 bg-black/50"></div>
      <div class="absolute bottom-0 inset-x-0 bg-ink-1 rounded-t-3xl p-4 pb-8 safe-b fade-in" data-stop>${NAV.filter(n => !MOBILE_NAV.includes(n[0])).map(([k,l,i]) =>
        `<button data-a="tab" data-v="${k}" class="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-left font-medium ${ui.tab===k?'bg-ink-2 text-blue':''}"><span class="w-6 text-center">${i}</span>${l}</button>`).join('')}</div></div>` : ''}`;
}
function pageHead(title, sub, right = '') {
  return `<header class="px-4 lg:px-8 pt-5 lg:pt-7 pb-4 flex flex-wrap items-end justify-between gap-3">
    <div class="lg:hidden flex items-center justify-between w-full -mb-1"><span class="font-display text-lg font-bold tracking-wide">CARNET<span class="text-good">.</span>HB</span><span id="sync-m">${syncBadge()}</span></div>
    <div>
    <h1 class="font-display text-3xl lg:text-4xl font-bold leading-tight">${title}</h1>${sub ? `<p class="text-txt-2 text-sm mt-1">${sub}</p>` : ''}</div>
    <div class="flex flex-wrap items-center gap-2">${right}</div></header>`;
}
const card = (inner, cls = '') => `<section class="card p-4 lg:p-5 ${cls}">${inner}</section>`;
const h2 = (t, right = '') => `<div class="flex flex-wrap items-center justify-between gap-2 mb-3"><h2 class="font-display text-xl font-semibold">${t}</h2>${right}</div>`;
const vigChip = lv => { const v = VIG[lv]; return `<span class="chip bg-${v.c}/15 text-${v.c}"><span aria-hidden="true">${v.i}</span>${v.l}</span>`; };
const statusChip = st => { const s = STATUS[st]; return `<span class="chip ${s.c}"><span aria-hidden="true">${s.i}</span>${s.l}</span>`; };
const btn = (label, a, attrs = '', kind = 'primary') => {
  const k = { primary:'bg-blue text-white hover:brightness-110', good:'bg-good text-ink-0', ghost:'border border-ink-3 text-txt-2 hover:text-txt-1 hover:border-txt-3', danger:'border border-bad/50 text-bad', warn:'bg-warn text-ink-0' }[kind];
  return `<button data-a="${a}" ${attrs} class="min-h-[44px] px-4 rounded-xl font-semibold text-sm ${k} disabled:opacity-40 disabled:cursor-not-allowed">${label}</button>`;
};
function chips(group, value, opts, cols = '') {
  return `<div class="seg ${cols || 'flex flex-wrap'} gap-1.5" role="radiogroup">${opts.map(([v, l, tone]) => {
    const sel = String(value) === String(v);
    const on = { good:'bg-good text-ink-0 border-good', warn:'bg-warn text-ink-0 border-warn', bad:'bg-bad text-ink-0 border-bad' }[tone] || 'bg-blue text-white border-blue';
    return `<button type="button" role="radio" aria-checked="${sel}" data-a="pick" data-g="${group}" data-v="${v}" class="min-h-[44px] px-3 rounded-xl border text-sm font-semibold ${sel ? on : 'border-ink-3 bg-ink-2 text-txt-2 hover:border-txt-3'}">${l}</button>`; }).join('')}</div>`;
}
const rpeOpts = () => Array.from({length:10}, (_,i) => [i+1, i+1, i < 5 ? 'good' : i < 8 ? 'warn' : 'bad']);
function slider(bind, value, { min=0, max=10, label='', hint='', invert=false } = {}) {
  const v = value ?? '';
  return `<label class="block"><div class="flex justify-between text-sm mb-1"><span>${label}</span><b data-out="${bind}" class="${sliderTone(v, invert)}">${v === '' ? '—' : v}</b></div>
    <input type="range" min="${min}" max="${max}" step="1" value="${v === '' ? Math.round((min+max)/2) : v}" data-bind="${bind}" data-invert="${invert?1:0}" class="w-full ${v === '' ? 'opacity-50' : ''}" aria-label="${esc(label)}">
    ${hint ? `<div class="flex justify-between text-[10px] text-txt-3 mt-0.5"><span>${hint.split('|')[0]}</span><span>${hint.split('|')[1]||''}</span></div>` : ''}</label>`;
}
function sliderTone(v, invert) { if (v === '' || v == null) return 'text-txt-3'; const x = invert ? 10 - v : v; return x <= 2 ? 'text-good' : x <= 4 ? 'text-warn' : 'text-bad'; }
function toast(msg, tone = '') {
  const t = document.getElementById('toast');
  t.innerHTML = `<div class="rounded-2xl bg-ink-2 border ${tone==='warn' ? 'border-warn/50' : 'border-ink-3'} px-4 py-3 text-sm shadow-2xl fade-in max-w-sm">${msg}</div>`;
  t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 3200);
}
function emptyState(title, text, action = '') {
  return `<div class="rounded-2xl border border-dashed border-ink-3 p-6 text-center"><div class="font-semibold">${title}</div><p class="text-sm text-txt-3 mt-1 max-w-md mx-auto">${text}</p>${action ? `<div class="mt-3">${action}</div>` : ''}</div>`;
}
function progressRing(pct, size = 92) {
  const r = size/2 - 7, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Progression ${pct} %">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#2f343b" stroke-width="8"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#34c77b" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct/100)}" transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="50%" y="50%" text-anchor="middle" dy="7" font-size="20" font-weight="700" fill="#eef0f2" font-family="Barlow Condensed">${pct}%</text></svg>`;
}

/* =====================================================================
   GRAPHIQUES SVG (ligne / barres, groupées ou empilées, avec survol)
   ===================================================================== */
const SERIES = ['#3987e5', '#d95926', '#199e70']; // palette catégorielle validée (mode sombre)
const CHARTS = {};
function chartBox(id, cfg, h = 200) {
  CHARTS[id] = { ...cfg, h };
  const multi = cfg.series.length > 1;
  return `${multi ? `<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-txt-2 mb-1">${cfg.series.map(s => `<span class="flex items-center gap-1.5"><span class="inline-block w-3 ${cfg.type==='bar' ? 'h-2.5 rounded-sm' : 'h-0.5 rounded'}" style="background:${s.color}${s.dash ? ';opacity:.6' : ''}"></span>${s.name}</span>`).join('')}</div>` : ''}
    <div class="chart relative" data-chart="${id}" style="height:${h}px"></div>`;
}
function niceTicks(lo, hi, int) {
  if (hi === lo) { hi = lo + 1; lo = Math.max(0, lo - 1); }
  const raw = (hi - lo) / 4, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = (int ? [1,2,5,10] : [1,2,2.5,5,10]).map(k => k*mag).find(k => k >= raw) || raw;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
  for (let v = a; v <= b + 1e-9; v += step) t.push(+v.toFixed(2));
  return t;
}
function drawCharts() {
  document.querySelectorAll('.chart').forEach(el => {
    const c = CHARTS[el.dataset.chart]; if (!c) return;
    const W = el.clientWidth || 320, H = c.h, m = { l:38, r:10, t:10, b:24 };
    const n = c.labels.length; if (!n) { el.innerHTML = ''; return; }
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    let vals = c.series.flatMap(s => s.values).filter(v => v != null);
    if (c.stacked) vals = c.labels.map((_, i) => c.series.reduce((a, s) => a + (s.values[i] || 0), 0));
    const lo = c.min != null ? c.min : (c.type === 'bar' ? 0 : Math.min(...vals));
    const hi = c.max != null ? c.max : Math.max(...vals, lo + 1);
    const ticks = niceTicks(lo, hi, c.int); const y0 = ticks[0], y1 = ticks[ticks.length-1];
    const Y = v => m.t + (1 - (v - y0) / (y1 - y0)) * ph;
    const band = pw / n, X = i => m.l + band * i + band / 2;
    let s = `<svg width="${W}" height="${H}" role="img" aria-label="${esc(c.title || 'graphique')}">`;
    if (c.zone) s += `<rect x="${m.l}" y="${Y(Math.min(c.zone, y1))}" width="${pw}" height="${Y(y0) - Y(Math.min(c.zone, y1))}" fill="#34c77b" opacity=".07"/>`;
    ticks.forEach(t => s += `<line x1="${m.l}" x2="${W-m.r}" y1="${Y(t)}" y2="${Y(t)}" stroke="#2f343b"/><text x="${m.l-6}" y="${Y(t)+4}" text-anchor="end" font-size="10" fill="#858c96">${t}</text>`);
    const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 46))));
    c.labels.forEach((l, i) => { if (i % every === 0 || i === n-1 && n < 8) s += `<text x="${X(i)}" y="${H-6}" text-anchor="middle" font-size="10" fill="#858c96">${esc(l)}</text>`; });
    if (c.type === 'bar') {
      const gs = c.stacked ? 1 : c.series.length, bw = Math.max(3, Math.min(28, (band * 0.7) / gs));
      c.labels.forEach((_, i) => {
        let acc = 0;
        c.series.forEach((se, k) => {
          const v = se.values[i]; if (!v) return;
          let x, yTop, yBot;
          if (c.stacked) { x = X(i) - bw/2; yBot = Y(y0 + acc); acc += v; yTop = Y(y0 + acc); }
          else { x = X(i) - (bw * gs)/2 + k * bw; yTop = Y(v); yBot = Y(y0); }
          const hgt = Math.max(1, yBot - yTop - (c.stacked && k > 0 ? 2 : 0));
          s += `<rect x="${x + (c.stacked ? 0 : 1)}" y="${yTop}" width="${bw - (c.stacked ? 0 : 2)}" height="${hgt}" rx="3" fill="${se.color}"/>`;
        });
      });
    } else {
      c.series.forEach(se => {
        let d = '', pen = false;
        se.values.forEach((v, i) => { if (v == null) { if (!c.connect) pen = false; return; } d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`; pen = true; });
        s += `<path d="${d}" fill="none" stroke="${se.color}" stroke-width="2" ${se.dash ? 'stroke-dasharray="5 4" opacity=".75"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
        if (!se.dash && n <= 60) se.values.forEach((v, i) => { if (v != null) s += `<circle cx="${X(i)}" cy="${Y(v)}" r="3.5" fill="${se.color}" stroke="#1b1e23" stroke-width="2"/>`; });
      });
    }
    s += `<line class="xh" y1="${m.t}" y2="${H-m.b}" stroke="#858c96" stroke-dasharray="3 3" opacity="0"/><rect class="hit" x="${m.l}" y="0" width="${pw}" height="${H}" fill="transparent"/></svg><div class="tip hidden"></div>`;
    el.innerHTML = s;
    const tip = el.querySelector('.tip'), xh = el.querySelector('.xh');
    const move = ev => {
      const r = el.getBoundingClientRect(), cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      const i = Math.max(0, Math.min(n-1, Math.floor((cx - m.l) / band)));
      xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); xh.setAttribute('opacity', 1);
      tip.innerHTML = `<div class="text-txt-3 mb-1">${esc(c.full ? c.full[i] : c.labels[i])}</div>` + c.series.map(se => se.values[i] == null ? '' :
        `<div class="flex items-center gap-2"><span class="w-2 h-2 rounded-full" style="background:${se.color}"></span><span class="text-txt-2">${se.name}</span><b class="ml-auto pl-3">${se.values[i]}${c.unit ? ' ' + c.unit : ''}</b></div>`).join('');
      tip.classList.remove('hidden');
      const tw = tip.offsetWidth; tip.style.left = (X(i) + 12 + tw > W ? X(i) - tw - 12 : X(i) + 12) + 'px'; tip.style.top = '4px';
    };
    const hit = el.querySelector('.hit');
    hit.addEventListener('mousemove', move); hit.addEventListener('touchstart', move, { passive:true }); hit.addEventListener('touchmove', move, { passive:true });
    hit.addEventListener('mouseleave', () => { tip.classList.add('hidden'); xh.setAttribute('opacity', 0); });
  });
}
function movingAvg(vals, k = 3) {
  return vals.map((_, i) => { const w = vals.slice(Math.max(0, i-k+1), i+1).filter(v => v != null); return w.length ? round1(avg(w)) : null; });
}
function trendOf(vals) {
  const v = vals.filter(x => x != null); if (v.length < 4) return '';
  const h = Math.floor(v.length/2), a = avg(v.slice(0,h)), b = avg(v.slice(h));
  const d = b - a, pct = a ? Math.round(d / Math.abs(a) * 100) : 0;
  if (Math.abs(pct) < 5) return `<span class="text-xs text-txt-3">→ stable</span>`;
  return `<span class="text-xs ${d > 0 ? 'text-txt-1' : 'text-txt-1'}">${d > 0 ? '↗' : '↘'} ${d > 0 ? '+' : ''}${pct} % (2ᵉ moitié vs 1ʳᵉ)</span>`;
}
