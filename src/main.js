/* =====================================================================
   RENDU
   ===================================================================== */
function render() {
  const views = { today:vToday, inbox:vInbox, data:vData, dash:vDash, prog:vProg, sess:vSessions, stats:vStats, care:vCare, cal:vCal, set:vSet };
  if (!views[ui.tab]) ui.tab = 'today';
  const app = document.getElementById('app');
  const runner = document.getElementById('runner'), rs = runner ? runner.scrollTop : 0, wz = document.getElementById('wizard'), ws = wz ? wz.scrollTop : 0;
  const demo = DEMO ? `<div class="sticky top-0 z-20 bg-warn text-ink-0 text-sm font-semibold px-4 py-2 flex items-center justify-between gap-2"><span>MODE DÉMO — données fictives, rien n’est enregistré</span><button data-a="demo-off" class="underline">Quitter</button></div>` : '';
  app.innerHTML = navHtml() + `<div class="lg:pl-64 pb-28 lg:pb-10">${demo}${views[ui.tab]()}</div>` + overlays() + (DB().active && ui.runOpen && !ui.wiz ? vRunner() : '') + (ui.wiz ? (ui.wiz.type === 'ci' ? wizCheckin() : DB().active ? wizBilan() : '') : '');
  const r2 = document.getElementById('runner'); if (r2) r2.scrollTop = rs; const w2 = document.getElementById('wizard'); if (w2 && !ui._wizTop) w2.scrollTop = ws; ui._wizTop = false;
  document.body.style.overflow = (ui.sheet || ui.wiz || (DB().active && ui.runOpen)) ? 'hidden' : '';
  requestAnimationFrame(drawCharts);
}
function animate() { document.body.classList.add('anim'); clearTimeout(animate.t); animate.t = setTimeout(() => document.body.classList.remove('anim'), 260); }
function go(tab) { animate(); ui.tab = tab; ui.more = false; ui.sheet = null; rememberUi(); render(); window.scrollTo(0, 0); }
function rer() { const y = window.scrollY; render(); window.scrollTo(0, y); }

/* =====================================================================
   ACTIONS
   ===================================================================== */
const A = DB;
function act() { return DB().active; }
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => { if (o[k] == null) o[k] = {}; o = o[k]; }); o[ks[ks.length-1]] = val; }
function getPath(obj, path) { return path.split('.').reduce((o, k) => o == null ? o : o[k], obj); }
function ensureCustom(p, k) { const st = ST(); st.custom[p] = st.custom[p] || {}; if (!st.custom[p][k]) st.custom[p][k] = clone(BLUEPRINT[p][k]); return st.custom[p][k]; }

async function saveFile(name, data) {
  try {
    const dl = window.claude && window.claude.use ? await Promise.race([window.claude.use('downloads'), new Promise(r => setTimeout(() => r(null), 3000))]) : null;
    if (dl) { await dl.save({ filename: name, data }); toast('✓ Fichier enregistré'); return; }
  } catch (e) { if (e && e.code === 'declined') { toast('Téléchargement annulé'); return; } }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: name.endsWith('.json') ? 'application/json' : 'text/csv' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); toast('Téléchargement lancé'); }
  catch (e) { toast('Téléchargement impossible ici', 'warn'); }
}
const csvCell = v => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = rows => '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\n');
function doExport(kind) {
  const d = DB(), stamp = today();
  if (kind === 'json') return saveFile(`carnet-handball-${stamp}.json`, JSON.stringify({ app:'carnet-handball', v:2, exportedAt:new Date().toISOString(), demo: !!DEMO, state:d.state, logs:d.logs, checkins:d.checkins }, null, 2));
  if (kind === 'csv-s') return saveFile(`seances-${stamp}.csv`, csv([['date','semaine','phase','seance','statut','duree_min','rpe','charge_UA','tonnage_kg','sensations','douleur_mollet_G','douleur_mollet_D','douleur_epaule','commentaire'],
    ...d.logs.sort((a,b) => a.date.localeCompare(b.date)).map(l => [l.date, l.w, l.phase, SESSIONS[l.key].name, l.status, l.durMin, l.rpe, logLoad(l), l.tonnage, l.sens, l.pains && l.pains.calfL, l.pains && l.pains.calfR, l.pains && l.pains.shoulder, l.comment])]));
  if (kind === 'csv-x') { const rows = [['date','seance','exercice','serie','repetitions','charge','validee','rpe_exercice','technique','douleur','km','minutes']];
    d.logs.forEach(l => Object.entries(l.ex).forEach(([id, x]) => (x.sets||[]).forEach((s, i) => rows.push([l.date, l.key, EX[id] ? EX[id].n : id, i+1, s.reps, s.load, s.done ? 1 : 0, x.rpe, x.tech, x.pain ? `${x.pain.zone}:${x.pain.level}` : '', i === 0 ? x.km : '', i === 0 ? x.min : '']))));
    return saveFile(`series-${stamp}.csv`, csv(rows)); }
  if (kind === 'csv-c') return saveFile(`suivi-${stamp}.csv`, csv([['date','molletG_douleur','molletG_raideur','molletG_sensation','molletG_tol_course','molletG_tol_sauts','molletG_tol_renfo','molletD_douleur','molletD_raideur','molletD_sensation','molletD_tol_course','molletD_tol_sauts','molletD_tol_renfo','epaule_stabilite','epaule_douleur','epaule_fatigue','epaule_tol_renfo','epaule_preventif','sommeil','sommeil_h','fatigue','motivation','recuperation','fc_repos','vfc_ms','score_sommeil','body_battery'],
    ...Object.keys(d.checkins).sort().map(k => { const c = d.checkins[k], L = c.calfL||{}, R = c.calfR||{}, S = c.shoulder||{}, G = c.gen||{};
      return [k, L.pain, L.stiff, L.sens, L.tolRun, L.tolJump, L.tolStr, R.pain, R.stiff, R.sens, R.tolRun, R.tolJump, R.tolStr, S.stab, S.pain, S.fatigue, S.tolStr, S.prev, G.sleep, G.sleepH, G.fatigue, G.motiv, G.recov, G.rhr, G.hrv, G.sleepScore, G.bb]; })]));
}
function replaceReal(n) {
  REAL.logs.forEach(l => { if (!n.logs.some(x => x.id === l.id)) persistDelete(l.id); });
  REAL.state = migrate(n.state); REAL.logs = n.logs || []; REAL.checkins = n.checkins || {}; REAL.active = null;
  persist('core', 'checkins', 'active', ...REAL.logs.map(l => 's_' + l.id));
}
function persistDelete(id) { if (Sync.mode === 'cloud' && !DEMO) cloudWrite('-s_' + id); }

function validatePhaseConfirm(n) {
  const cr = ST().criteria[n] || [], miss = cr.filter(c => c.status !== 'ok');
  ui.sheet = { type:'html', html:`<div class="space-y-3"><h3 class="font-display text-2xl font-bold">Valider le passage en phase ${n+1} ?</h3>
    ${miss.length ? `<div class="rounded-xl bg-warn/10 border border-warn/40 p-3 text-sm"><b class="text-warn">${miss.length} critère(s) non validé(s) :</b><ul class="mt-1 list-disc pl-5 text-txt-2">${miss.map(c => `<li>${esc(c.label)} — ${({todo:'à évaluer',ko:'non validé',reeval:'à réévaluer'})[c.status]}</li>`).join('')}</ul></div>` : '<div class="rounded-xl bg-good/10 border border-good/40 p-3 text-sm text-good">Tous les critères sont validés.</div>'}
    <p class="text-sm text-txt-2">La validation est une décision : elle ne vaut pas aptitude médicale. Pour le passage en phase 3 (reprise collective), l’avis de ton kiné est requis.</p>
    <label class="block"><span class="lbl">Commentaire de validation</span><input id="val-comment" class="inp w-full" placeholder="ex. validé avec le kiné le …"></label>
    <div class="flex justify-end gap-2">${btn('Annuler', 'sheet-close', '', 'ghost')}${btn('Je valide le passage', 'phase-do', `data-v="${n}"`, miss.length ? 'warn' : 'good')}</div></div>` };
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return;
  if (b.tagName === 'SELECT' || (b.tagName === 'INPUT' && b.type !== 'checkbox')) return;
  if (e.target.closest('[data-stop]') && b.dataset.a === 'more' && !b.closest('[data-stop]')) {}
  const a = b.dataset.a, v = b.dataset.v, st = ST(), run = act();
  switch (a) {
    case 'tab': go(v); break;
    case 'more': if (e.target.closest('[data-stop]')) return; ui.more = !ui.more; render(); break;
    case 'goto-set': ui.setTab = v; go('set'); break;
    case 'onboard': st.onboarded = true; persist(); toast('Bonne reprise ! Commence par la séance A de la semaine 1.'); rer(); break;
    case 'run-open': ui.runOpen = true; render(); break;
    case 'run-start':
      if (run && run.slot !== v) { ui.sheet = { type:'html', html:`<div class="space-y-3"><h3 class="font-display text-xl font-bold">Une séance est déjà en cours</h3><p class="text-sm text-txt-2">Termine-la ou reprends-la avant d’en commencer une autre.</p><div class="flex gap-2 justify-end">${btn('Abandonner l’ancienne', 'run-discard', `data-v="${v}"`, 'danger')}${btn('Reprendre', 'run-open')}</div></div>` }; render(); break; }
      if (run) { ui.runOpen = true; ui.sheet = null; render(); break; }
      ui.sheet = null; startRun(v); render(); break;
    case 'run-discard': DB().active = null; persist('active'); startRun(v); ui.sheet = null; render(); break;
    case 'open-slot': { const p = parseSlot(v); ui.sessWeek = p.w; ui.sess = v; ui.sheet = null; go('sess'); break; }
    case 'prop-yes': case 'prop-no': { const p = allProposals().find(x => x.key === v); if (!p) break;
      if (a === 'prop-yes') applyValue(p.id, p.next);
      st.decisions.push({ key:p.key, ex:p.id, action:p.action, from:p.cur, to: a === 'prop-yes' ? p.next : p.cur, accepted: a === 'prop-yes', date: today(), why: p.why });
      persist(); toast(a === 'prop-yes' ? `✓ ${EX[p.id].n} : ${fmtValue(p.id, p.next)}` : 'Proposition refusée : palier maintenu'); rer(); break; }
    case 'sess-week': ui.sessWeek = Math.max(1, +v); ui.sess = null; rer(); break;
    case 'pick-slot': ui.sess = v; rer(); break;
    case 'toggle': ui.open[v] = !ui.open[v]; if (b.tagName === 'SUMMARY') e.preventDefault(); rer(); break;
    case 'slot-keep': st.slotStatus[v] = 'keep'; persist(); ui.sheet = ui.sheet && ui.sheet.type === 'slot' ? ui.sheet : null; rer(); break;
    case 'show-log': ui.sheet = { type:'log', id:v }; render(); break;
    case 'log-del': { const l = DB().logs.find(x => x.id === v); DB().logs = DB().logs.filter(x => x.id !== v); if (!DEMO) { const tb = ST().tomb = ST().tomb || { logs:{}, events:{} }; tb.logs = tb.logs || {}; tb.logs[v] = Date.now(); persist(); persistDelete(v); } ui.sheet = null; toast('Séance supprimée'); rer(); break; }
    // ---- runner
    case 'run-close': ui.runOpen = false; render(); break;
    case 'run-pause': if (run.pausedAt) { run.pausedMs += Date.now() - run.pausedAt; run.pausedAt = null; } else run.pausedAt = Date.now(); persist('active'); render(); break;
    case 'rest-skip': run.restUntil = null; render(); break;
    case 'run-finish': ui.wiz = { type:'bilan', step:0 }; ui._wizTop = true; persist('active'); render(); break;
    case 'wiz-ci': ui.wiz = { type:'ci', step:0 }; ui.ci = null; ui._wizTop = true; animate(); render(); break;
    case 'wiz-next': ui.wiz.step++; ui._wizTop = true; animate(); render(); break;
    case 'wiz-prev': ui.wiz.step = Math.max(0, ui.wiz.step - 1); ui._wizTop = true; animate(); render(); break;
    case 'wiz-close': if (ui.wiz.type === 'bilan' && run && run.quick) { DB().active = null; persist('active'); } ui.wiz = null; render(); break;
    case 'ci-copy-wiz': { const pv = checkinFor(addDays(today(), -1)); if (pv) { ui.ci = clone(pv); ui.ciFor = today(); toast('Valeurs d’hier reprises : vérifie chaque écran'); } render(); break; }
    case 'wiz-ci-save': DB().checkins[today()] = { ...clone(ui.ci), _u: Date.now() }; persist('checkins'); ui.wiz = null; { const vg = vigilanceToday(); toast(`✓ Suivi enregistré · vigilance ${VIG[vg.global].l.toLowerCase()}`); } rer(); break;
    case 'quick-done': if (run && run.slot !== v) { toast('Termine d’abord la séance en cours.', 'warn'); break; } if (run) DB().active = null; ui.sheet = null; startQuickDone(v); ui._wizTop = true; animate(); render(); break;
    case 'run-now': { const p = parseSlot(v), s = slot(p.w, p.key); if (s.date !== today()) st.moves[v] = { date: today() }; persist(); if (run && run.slot !== v) { toast('Une séance est déjà en cours.', 'warn'); break; } if (!run) startRun(v); ui.runOpen = true; render(); break; }
    case 'bil-detail': run.quick = false; run.items.forEach(it => it.sets.forEach(x => x.done = false)); ui.wiz = null; ui.runOpen = true; persist('active'); render(); break;
    case 'coll-skip': { const ev = st.events.find(x => x.id === v); ev.asked = true; ev.done = false; persist(); rer(); break; }
    case 'data-tab': ui.dataTab = v; rer(); break;
    case 'sync-later': ui.syncDismissed = true; rer(); break;
    case 'gh-save': { const val = id => (document.getElementById(id).value || '').trim();
      const c = { owner: val('gh-owner').replace(/^@/, ''), repo: val('gh-repo') || 'carnet-handball-data', path:'carnet.json', branch:'main', token: val('gh-token'), first: !GH.on() };
      if (!c.owner || !c.token) { toast('Renseigne ton pseudo GitHub et le jeton.', 'warn'); break; }
      const was = GH.on(); GH.save(c); Sync.mode = 'github'; GH.err = '';
      if (!was) { window.addEventListener('online', () => ghSync('online')); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ghSync('focus'); }); setInterval(() => { if (document.visibilityState === 'visible') ghSync('poll'); }, 90000); }
      toast('Connexion à GitHub…'); ghSync('setup').then(() => { toast(GH.err ? '⚠ ' + GH.err : '✓ Synchronisation active : tes données sont sauvegardées sur GitHub', GH.err ? 'warn' : ''); rer(); }); break; }
    case 'gh-now': ghSync('manual').then(() => { toast(GH.err ? '⚠ ' + GH.err : '✓ Synchronisé', GH.err ? 'warn' : ''); rer(); }); break;
    case 'gh-off': GH.save(null); Sync.mode = 'local'; setSync('local'); toast('Synchronisation désactivée sur cet appareil (données locales conservées)'); rer(); break;
    case 'bil-back': run.finishing = false; render(); break;
    case 'bil-save': { ui.wiz = null; const l = saveRun(); toast(`✓ Séance enregistrée${l.status === 'incomplete' ? ' (incomplète)' : ''}. Suivi à 24 h et 48 h à faire demain et après-demain.`); go('today'); break; }
    case 'run-cur': run.cur = run.cur === +v ? -1 : +v; persist('active'); render(); { const el = document.querySelectorAll('#runner article')[+v]; if (el) el.scrollIntoView({ block:'start', behavior:'smooth' }); } break;
    case 'run-stop': run.items[+v].stopped = true; persist('active'); render(); break;
    case 'run-override': run.items[+v].override = true; run.items[+v].comment = (run.items[+v].comment ? run.items[+v].comment + ' · ' : '') + 'Réalisé malgré vigilance rouge (autorisation kiné déclarée)'; persist('active'); render(); break;
    case 'run-check': run.items[+v].checked = b.checked; render(); break;
    case 'run-adapt': { const it = run.items[+v], ex = EX[it.id], m = b.dataset.m;
      if (m === 'keep') { it.dismissed = true; }
      else if (m === 'alt') { it.swapped = ex.alt; it.adapted = 'alt'; }
      else { it.adapted = 'reduce';
        if (ex.kind === 'strength' && !ex.repsProg) it.sets.forEach(s => { if (!s.done && s.load) s.load = Math.round(s.load * 0.8 / (ex.step||1)) * (ex.step||1); });
        else if (ex.kind === 'strength' || ex.kind === 'time') it.sets.forEach(s => { if (!s.done) s.reps = Math.max(1, Math.round(s.reps * 0.8)); });
        else if (it.sets.length > 1) it.sets.pop(); }
      persist('active'); render(); break; }
    case 'run-pain': { const it = run.items[+v]; it.pain = { zone: EX[it.id].zone === 'shoulder' ? 'shoulder' : 'calfR', level: null }; persist('active'); render(); break; }
    case 'run-pain-clear': run.items[+v].pain = null; persist('active'); render(); break;
    case 'set-done': { const it = run.items[+b.dataset.i], s = it.sets[+b.dataset.k], ex = EX[it.id];
      s.done = !s.done;
      if (s.done && (ex.kind === 'strength' || ex.kind === 'time') && it.sets.some(x => !x.done)) { const r = restSec(it.pres.rest); run.restUntil = r ? Date.now() + r*1000 : null; }
      persist('active'); render(); break; }
    case 'set-step': { const it = run.items[+b.dataset.i], s = it.sets[+b.dataset.k], ex = EX[it.id], f = b.dataset.f, d = +b.dataset.d;
      const step = f === 'load' ? (exState(it.id).step || ex.step || 1) : ex.kind === 'time' ? 5 : 1;
      s[f] = Math.max(0, round1((+s[f] || 0) + d * step)); persist('active'); render(); break; }
    // ---- choix (chips)
    case 'pick': {
      const g = b.dataset.g; let val = isNaN(+v) || v === '' ? v : +v;
      const [kind, x, y] = g.split(':');
      if (kind === 'rpe') run.items[+x].rpe = val;
      else if (kind === 'fb') { const it = run.items[+x], t = it.pres.rpe || 7; it.fb = val; ({ easy:() => { it.rpe = Math.max(1, t-1); it.tech = 1; }, ok:() => { it.rpe = t; it.tech = 1; }, hard:() => { it.rpe = Math.min(10, t+1); it.tech = 2; }, bad:() => { it.rpe = Math.min(10, t+2); it.tech = 3; } })[val](); }
      else if (kind === 'wci') setPath(ui.ci, x, val);
      else if (kind === 'wbil') run.bilan.pains[x] = val;
      else if (kind === 'bilq') { run.bilan.quality = val; run.items.forEach(it => { if (EX[it.id].kind === 'check') return; if (val === 1) { it.rpe = it.pres.rpe; it.tech = 1; } else if (val === 2) { it.rpe = Math.min(10, (it.pres.rpe||7) + 1); it.tech = 2; } else { it.rpe = null; it.tech = null; } }); }
      else if (kind === 'tech') run.items[+x].tech = val;
      else if (kind === 'painz') run.items[+x].pain.zone = val;
      else if (kind === 'bil') run.bilan[x] = val;
      else if (kind === 'ci') { const cur = getPath(ui.ci, x); setPath(ui.ci, x, cur === val ? null : val); }
      else if (kind === 'ev') { const ev = st.events.find(q => q.id === y); if (x === 'done') ev.done = val === 1; else ev.rpe = val; persist(); }
      else if (kind === 'crit') { const c = st.criteria[x].find(q => q.id === y); c.status = val; if (val !== 'todo' && !c.date) c.date = today(); persist(); }
      if (['rpe','tech','painz','bil','fb','wbil','bilq'].includes(kind)) persist('active');
      rer(); break; }
    // ---- suivi quotidien
    case 'ci-copy': { const p = checkinFor(addDays(ui.ciDate || today(), -1)); if (p) { ui.ci = clone(p); toast('Valeurs de la veille reprises : ajuste ce qui a changé'); rer(); } break; }
    case 'ci-save': { const date = ui.ciDate || today(), c = ui.ci;
      const filled = ['calfL','calfR'].every(z => c[z].pain != null) && c.shoulder.pain != null;
      if (!filled) { toast('Renseigne au minimum la douleur des deux mollets et de l’épaule.', 'warn'); break; }
      DB().checkins[date] = { ...clone(c), _u: Date.now() }; persist('checkins');
      const vg = vigilanceToday(); toast(date === today() ? `✓ Suivi enregistré · vigilance ${VIG[vg.global].l.toLowerCase()}` : '✓ Suivi enregistré'); rer(); break; }
    // ---- progression
    case 'range': ui.statsRange = v; rer(); break;
    case 'chart-ex': ui.chartEx = v; rer(); break;
    // ---- calendrier
    case 'cal-nav': { const ref = ui.calRef || today(); ui.calRef = +v === 0 ? today() : ui.calMode === 'week' ? addDays(ref, 7 * +v) : (() => { const d = D8(ref.slice(0,8) + '01'); d.setMonth(d.getMonth() + +v); return iso(d); })(); rer(); break; }
    case 'cal-mode': ui.calMode = v; rer(); break;
    case 'ev-new': { const ev = { id: uid(), _c: Date.now(), type:v, date: ui.calRef && ui.calRef >= today() ? ui.calRef : today(), duration: v === 'collectif' ? st.settings.collective.duration : null, rpe:null, done:false, notes:'' };
      st.events.push(ev); persist(); ui.sheet = { type:'ev', id: ev.id }; render(); break; }
    case 'sheet-slot': ui.sheet = { type:'slot', id:v }; render(); break;
    case 'sheet-ev': ui.sheet = { type:'ev', id:v }; render(); break;
    case 'sheet-close': ui.sheet = null; render(); break;
    case 'slot-move': { const p = parseSlot(v), s = slot(p.w, p.key); const d = b.dataset.d || (document.getElementById('mv-date') || {}).value; if (!d) break;
      if (d === s.planned) delete st.moves[v]; else st.moves[v] = { date:d };
      if (st.slotStatus[v] === 'missed') delete st.slotStatus[v];
      persist(); const cf = s.meta.calf ? calfEventsAround(d, v).filter(x => x.calf) : [];
      toast(cf.length ? `⚠ Séance déplacée au ${fmtD(d)}, mais proche de : ${cf.map(x => x.label).join(', ')}` : `✓ Séance déplacée au ${fmtD(d)} (les autres séances ne bougent pas)`, cf.length ? 'warn' : ''); rer(); break; }
    case 'slot-unmove': delete st.moves[v]; persist(); rer(); break;
    case 'slot-missed': st.slotStatus[v] = 'missed'; persist(); rer(); break;
    case 'slot-clear': delete st.slotStatus[v]; persist(); rer(); break;
    case 'ev-del': st.events = st.events.filter(x => x.id !== v); st.tomb = st.tomb || { logs:{}, events:{} }; st.tomb.events = st.tomb.events || {}; st.tomb.events[v] = Date.now(); persist(); ui.sheet = null; rer(); break;
    case 'goto-bilan': ui.sheet = null; ui.progTab = 'phases'; ui.open['bil-' + curPhaseEntry().phase] = true; go('prog'); break;
    // ---- programme
    case 'prog-tab': ui.progTab = v; ui.editProg = false; rer(); break;
    case 'prog-phase': ui.progPhase = +v; rer(); break;
    case 'prog-key': ui.progKey = v; rer(); break;
    case 'prog-edit': ui.editProg = !ui.editProg; rer(); break;
    case 'prog-reset': if (st.custom[ui.progPhase]) delete st.custom[ui.progPhase][ui.progKey]; persist(); rer(); break;
    case 'it-move': { const arr = ensureCustom(ui.progPhase, ui.progKey), i = +v, j = i + +b.dataset.d; [arr[i], arr[j]] = [arr[j], arr[i]]; persist(); rer(); break; }
    case 'it-del': { const arr = ensureCustom(ui.progPhase, ui.progKey); arr.splice(+v, 1); persist(); rer(); break; }
    case 'it-add': { const id = document.getElementById('it-add').value, arr = ensureCustom(ui.progPhase, ui.progKey); const ex = EX[id];
      arr.push([id, ex.kind === 'strength' || ex.kind === 'time' ? 3 : 1, ex.kind === 'strength' && !ex.repsProg ? 10 : 0, 7, ex.kind === 'strength' ? '1′30' : '—']); persist(); rer(); break; }
    case 'lvl': { const ph = weekInfo(calWeek()).phase; st.levels[v] = Math.max(1, Math.min(FAMILY_MAX[v][ph], (st.levels[v]||1) + +b.dataset.d));
      st.decisions.push({ key:'manual-' + uid(), ex:v, action:'manual', to: st.levels[v], accepted:true, date: today() }); persist(); rer(); break; }
    case 'phase-validate': validatePhaseConfirm(+v); render(); break;
    case 'phase-do': { const n = +v, cw = calWeek(), hasLogs = DB().logs.some(l => l.w === cw);
      st.phase.history.push({ phase: n+1, startWeek: hasLogs ? cw + 1 : cw, validatedAt: today(), comment: (document.getElementById('val-comment')||{}).value || '' });
      persist(); ui.sheet = null; toast(`✓ Phase ${n+1} validée : elle démarre en semaine ${hasLogs ? cw+1 : cw}`); rer(); break; }
    case 'phase-undo': if (st.phase.history.length > 1) st.phase.history.pop(); persist(); rer(); break;
    // ---- paramètres
    case 'set-tab': ui.setTab = v; ui.confirmReset = false; rer(); break;
    case 'coll-day': { const ds = st.settings.collective.days, i = +v; st.settings.collective.days = ds.includes(i) ? ds.filter(x => x !== i) : [...ds, i].sort(); persist(); rer(); break; }
    case 'coll-plan': { const from = Math.max(st.settings.collective.week, calWeek()); let n = 0;
      for (let w = from; w < from + 4; w++) st.settings.collective.days.forEach(d => { const date = addDays(weekStart(w), d); if (!st.events.some(x => x.type === 'collectif' && x.date === date)) { st.events.push({ id:uid(), _c: Date.now(), type:'collectif', date, duration: st.settings.collective.duration, rpe:null, done:false, notes:'' }); n++; } });
      persist(); toast(`✓ ${n} entraînement(s) collectif(s) planifié(s) à partir de S${from}`); rer(); break; }
    case 'th-reset': st.settings.thresholds = clone(DEFAULT_THRESHOLDS); persist(); rer(); break;
    case 'crit-add': st.criteria[b.dataset.p].push({ id:uid(), label:'Nouveau critère', status:'todo', date:'', comment:'' }); persist(); rer(); break;
    case 'crit-del': st.criteria[b.dataset.p] = st.criteria[b.dataset.p].filter(c => c.id !== v); persist(); rer(); break;
    case 'export': doExport(v); break;
    case 'import': { try { const n = JSON.parse(document.getElementById('import-box').value); if (!n.state || !Array.isArray(n.logs)) throw 0; if (n.demo) { toast('Ce fichier contient des données de démo : import refusé.', 'warn'); break; }
      if (DEMO) DEMO = null; replaceReal(n); toast('✓ Données importées'); rer(); } catch (err) { toast('Fichier JSON invalide', 'warn'); } break; }
    case 'demo-on': DEMO = makeDemo(); ui.sheet = null; ui.sessWeek = null; ui.sess = null; ui.ci = null; toast('Mode démo : données fictives'); go('today'); break;
    case 'demo-off': DEMO = null; ui.ci = null; ui.sessWeek = null; ui.sess = null; toast('Retour à tes données réelles'); go('today'); break;
    case 'reset': if (!ui.confirmReset) { ui.confirmReset = true; rer(); break; }
      REAL.logs.forEach(l => persistDelete(l.id)); REAL.state = freshState(); REAL.state.resetAt = Date.now(); REAL.logs = []; REAL.checkins = {}; REAL.active = null; ui.confirmReset = false; ui.ci = null;
      persist('core','checkins','active'); toast('Données effacées'); go('today'); break;
  }
});

/* Saisie : curseurs, champs */
document.addEventListener('input', e => {
  const el = e.target, run = act();
  if (el.dataset.bind) {
    const v = +el.value, k = el.dataset.bind;
    if (k.startsWith('runpain.')) run.items[+k.split('.')[1]].pain.level = v;
    else if (k.startsWith('bil.')) run.bilan.pains[k.split('.')[1]] = v;
    else setPath(ui.ci, k, v);
    el.classList.remove('opacity-50');
    const out = document.querySelector(`[data-out="${k}"]`); if (out) { out.textContent = v; out.className = sliderTone(v, el.dataset.invert === '1'); }
    return;
  }
  if (el.dataset.set && el.dataset.i != null) { const it = run.items[+el.dataset.i]; it.sets[+el.dataset.k][el.dataset.set] = el.value === '' ? '' : +el.value; clearTimeout(window._ra); window._ra = setTimeout(() => persist('active'), 600); return; }
  if (el.dataset.run) { const it = run.items[+el.dataset.i]; it[el.dataset.run] = el.value; clearTimeout(window._ra); window._ra = setTimeout(() => persist('active'), 600); return; }
  if (el.dataset.bil) { run.bilan[el.dataset.bil] = el.dataset.bil === 'durMin' ? +el.value : el.value; return; }
  if (el.dataset.ci) { setPath(ui.ci, el.dataset.ci, el.value === '' ? null : +el.value); return; }
});
document.addEventListener('change', e => {
  const el = e.target, st = ST(), run = act();
  if (el.dataset.bind && el.dataset.bind.startsWith('runpain.')) { persist('active'); rer(); return; }
  if (el.dataset.bind && el.dataset.bind.startsWith('bil.')) { persist('active'); return; }
  if (el.dataset.a === 'ci-date') { ui.ciDate = el.value || today(); ui.ci = null; rer(); return; }
  if (el.dataset.a === 'cmp') { ui.cmp[el.dataset.v] = el.value; rer(); return; }
  if (el.dataset.note) { st.exo[el.dataset.note] = { ...(st.exo[el.dataset.note]||{}), notes: el.value }; persist(); toast('Note enregistrée'); return; }
  if (el.dataset.set && el.dataset.i == null) {
    let v = el.value; const path = el.dataset.set;
    if (el.type === 'number' || el.tagName === 'SELECT') v = v === '' ? '' : +v;
    if (path === 'settings.startDate') v = mondayOf(v || today());
    setPath(st, path, v); persist(); if (path.startsWith('settings.')) rer(); return;
  }
  if (el.dataset.ev) { const ev = st.events.find(x => x.id === el.dataset.v); ev[el.dataset.ev] = el.dataset.ev === 'duration' ? +el.value : el.value; persist(); rer(); return; }
  if (el.dataset.crit) { const c = st.criteria[el.dataset.p].find(x => x.id === el.dataset.v); c[el.dataset.crit] = el.value; persist(); return; }
  if (el.dataset.bilan) { st.bilans[el.dataset.p] = st.bilans[el.dataset.p] || { results:{} }; st.bilans[el.dataset.p][el.dataset.bilan] = el.value; persist(); return; }
  if (el.dataset.test) { const b = st.bilans[el.dataset.p] = st.bilans[el.dataset.p] || { results:{} }; b.results = b.results || {}; b.results[el.dataset.v] = { ...(b.results[el.dataset.v]||{}), [el.dataset.test]: el.value === '' ? null : +el.value }; persist(); rer(); return; }
  if (el.dataset.it) { const arr = ensureCustom(ui.progPhase, ui.progKey), f = +el.dataset.it; arr[+el.dataset.v][f] = f === 4 ? el.value : +el.value; persist(); rer(); return; }
  if (el.dataset.exo) { const id = el.dataset.v, f = el.dataset.exo; st.exo[id] = { ...(st.exo[id]||{}), [f]: f === 'rule' ? el.value : +el.value }; persist(); toast('Réglage enregistré'); return; }
  if (el.dataset.lvl) { st.levels[el.dataset.lvl] = +el.value; persist(); return; }
  if (el.dataset.run || (el.dataset.set && el.dataset.i != null)) { persist('active'); }
});
window.addEventListener('resize', () => { clearTimeout(window._rz); window._rz = setTimeout(drawCharts, 150); });

/* Chronomètres de séance */
setInterval(() => {
  const a = act(); if (!a || !ui.runOpen) return;
  const el = document.getElementById('elapsed'); if (el) el.textContent = mmss(runElapsed(a));
  if (a.restUntil) {
    const r = document.getElementById('rest');
    if (a.restUntil <= Date.now()) { a.restUntil = null; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} render(); toast('Repos terminé : série suivante'); }
    else if (r) r.textContent = mmss(a.restUntil - Date.now());
  }
}, 1000);

/* =====================================================================
   DÉMO (données fictives, jamais enregistrées)
   ===================================================================== */
function makeDemo() {
  const saved = DEMO; const s = freshState();
  s.onboarded = true; s.settings.startDate = addDays(mondayOf(today()), -35); s.createdAt = s.settings.startDate;
  s.profile.vma = 16;
  s.phase.history.push({ phase:2, startWeek:5, validatedAt: addDays(s.settings.startDate, 27), comment:'[DÉMO] validé avec le kiné' });
  s.criteria[1].forEach(c => { c.status = 'ok'; c.date = addDays(s.settings.startDate, 27); c.comment = '[DÉMO]'; });
  s.criteria[2][0].status = 'reeval'; s.criteria[2][2].status = 'ok';
  s.bilans[1] = { date: addDays(s.settings.startDate, 26), comment:'[DÉMO] valeurs fictives', results:{ calfraise:{ L:24, R:21 }, kneewall:{ L:11, R:10 }, balance:{ L:22, R:17 }, stab:{ L:7 } } };
  DEMO = { state:s, logs:[], checkins:{}, active:null };
  const cw = calWeek();
  // suivi quotidien
  for (let d = 0; d <= diffDays(addDays(today(), -1), s.settings.startDate); d++) {
    const date = addDays(s.settings.startDate, d), wk = Math.floor(d/7);
    const spike = d === 16 ? 3 : d === 17 ? 2 : 0;
    DEMO.checkins[date] = { calfL:{ pain: d % 5 === 0 ? 1 : 0, stiff: 1 + (d % 3 === 0 ? 1 : 0), sens:'normale', tolRun:'bonne', tolJump: wk < 2 ? 'nt' : 'bonne', tolStr:'bonne' },
      calfR:{ pain: Math.max(spike, wk < 2 ? 2 : 1), stiff: spike ? 4 : wk < 2 ? 3 : 2, sens: spike ? 'tension' : 'normale', tolRun: spike ? 'moyenne' : 'bonne', tolJump: wk < 2 ? 'nt' : 'moyenne', tolStr:'bonne' },
      shoulder:{ stab: 7 + (wk > 2 ? 1 : 0), pain: d % 6 === 0 ? 2 : 1, fatigue: 2 + (d % 4 === 0 ? 2 : 0), tolStr:'bonne', prev: d % 2 ? 'oui' : 'non' },
      gen:{ sleep: 6 + (d % 3), sleepH: 7 + (d % 3) * 0.5, fatigue: 3 + (d % 4 === 1 ? 3 : 0), motiv: 8, recov: 7, rhr: 52 + (d % 4 === 1 ? 4 : d % 3), hrv: 68 - (d % 4 === 1 ? 9 : d % 3 * 2), sleepScore: 72 + (d % 5) * 3, bb: 65 + (d % 4) * 6 } };
  }
  // séances
  const prog = { squat:50, rdl:50, split:10, legcurl:30, calf_straight:20, calf_bent:30, row:22, bench:18, pulldown:45, facepull:15, landmine:15 };
  for (let w = 1; w < cw; w++) ['A','B','C','D'].forEach(k => {
    const sl = slot(w, k); if (sl.date >= today()) return;
    if (w === 3 && k === 'C') return; // séance non effectuée
    const wi = sl.info, plan = slotPlan(sl), ex = {};
    plan.forEach(p => {
      const e = p.ex; let sets;
      const load = !e.repsProg && e.kind === 'strength' ? round1(prog[p.id] != null ? prog[p.id] + (e.step||2) * Math.floor((w-1)/2) : p.load) : null;
      if (e.kind === 'strength' || e.kind === 'time') sets = Array.from({length:p.sets}, () => ({ reps:p.reps, load, done:true }));
      else if (e.kind === 'ladder') sets = Array.from({length:p.ladder.blocks}, () => ({ done:true }));
      else if (e.kind === 'level') sets = p.drills.map(() => ({ done:true }));
      else sets = [{ done:true }];
      const partial = w === 3 && k === 'B' && e.kind === 'ladder';
      if (partial) sets[sets.length-1].done = false;
      ex[p.id] = { pres:{ sets:p.sets, reps:p.reps, load, rpe:p.rpe, rest:p.rest, text:p.text, level:p.level, step:p.step }, sets, rpe: Math.max(1, p.rpe - (w % 2)), tech: e.inj && w < 2 ? 2 : 1, pain: partial ? { zone:'calfR', level:3 } : null, comment: partial ? '[DÉMO] tiraillement mollet droit, dernier bloc arrêté' : '',
        stopped: partial, km: e.run ? round1(p.ladder.km * (partial ? 0.8 : 1)) : null, min: e.run ? p.ladder.min : null, touched:true };
    });
    const status = w === 3 && k === 'B' ? 'incomplete' : 'done', dur = { A:65, B:45, C:55, D:60 }[k], rpe = { A:7, B:8, C:6, D:7 }[k];
    let ton = 0; Object.entries(ex).forEach(([id, x]) => { if (EX[id].kind === 'strength' && !EX[id].repsProg) x.sets.forEach(q => { if (q.done) ton += q.load * q.reps; }); });
    DEMO.logs.push({ id: uid(), slot: sl.id, w, key:k, phase: wi.phase, date: sl.date, start: D8(sl.date).getTime(), end: D8(sl.date).getTime() + dur*60000, durMin: dur, status, rpe, sens: status === 'incomplete' ? 'tensions' : 'normales', pains:{ calfL:0, calfR: status === 'incomplete' ? 3 : 1, shoulder:1 }, comment:'[DÉMO]', tonnage: Math.round(ton), ex });
    if (k === 'B' || k === 'D') s.levels[k === 'B' ? 'court' : 'long'] = Math.min(w < 3 ? w - 1 : w - 2, 5);
  });
  Object.entries(prog).forEach(([id, v]) => { s.exo[id] = { load: round1(v + (EX[id].step||2) * Math.floor((cw-2)/2)) }; });
  s.levels.proprio = 3; s.levels.appuis = 2; s.levels.agilite = 3;
  const out = DEMO; DEMO = saved; return out;
}

/* =====================================================================
   DÉMARRAGE
   ===================================================================== */
render();
initCloud();
if (GH.on()) ghSync('start');

/* Application installable + hors ligne (GitHub Pages) */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost') && !/claude\.ai|claudeusercontent/.test(location.hostname)) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => { const w = reg.installing; w && w.addEventListener('statechange', () => {
      if (w.state === 'installed' && navigator.serviceWorker.controller) { const t = document.getElementById('toast'); t.innerHTML = `<div class="rounded-2xl bg-ink-2 border border-blue/50 px-4 py-3 text-sm shadow-2xl flex items-center gap-3">Nouvelle version disponible <button onclick="location.reload()" class="text-blue font-semibold">Mettre à jour</button></div>`; t.classList.remove('hidden'); }
    }); });
  }).catch(() => {});
}

/* Glisser-déposer des séances dans le calendrier */
document.addEventListener('dragstart', e => { const el = e.target.closest && e.target.closest('[data-drag]'); if (!el) return; e.dataTransfer.setData('text/plain', el.dataset.drag); e.dataTransfer.effectAllowed = 'move'; });
document.addEventListener('dragover', e => { const z = e.target.closest && e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); document.querySelectorAll('[data-drop].drop-on').forEach(x => x !== z && x.classList.remove('drop-on')); z.classList.add('drop-on'); });
document.addEventListener('dragleave', e => { const z = e.target.closest && e.target.closest('[data-drop]'); if (z && !z.contains(e.relatedTarget)) z.classList.remove('drop-on'); });
document.addEventListener('drop', e => {
  const z = e.target.closest && e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); z.classList.remove('drop-on');
  const id = e.dataTransfer.getData('text/plain'), p = parseSlot(id); if (!p) return;
  const s = slot(p.w, p.key), d = z.dataset.drop, st = ST(); if (d === s.date) return;
  if (d === s.planned) delete st.moves[id]; else st.moves[id] = { date:d };
  if (st.slotStatus[id] === 'missed') delete st.slotStatus[id];
  persist(); const cf = s.meta.calf ? calfEventsAround(d, id).filter(x => x.calf) : [];
  toast(cf.length ? `⚠ ${s.meta.name} déplacée au ${fmtD(d)}, mais proche de : ${cf.map(x => x.label).join(', ')}` : `✓ ${s.meta.name} déplacée au ${fmtD(d)}`, cf.length ? 'warn' : ''); rer();
});
