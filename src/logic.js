/* =====================================================================
   OUTILS
   ===================================================================== */
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const D8 = s => new Date(s + 'T12:00:00');
const addDays = (s, n) => { const d = D8(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((D8(a) - D8(b)) / 86400000);
const mondayOf = s => { const d = D8(s); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return iso(d); };
const dow = s => (D8(s).getDay()+6)%7; // 0 = lundi
const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const DAYS_S = ['lun.','mar.','mer.','jeu.','ven.','sam.','dim.'];
const fmtD = s => D8(s).toLocaleDateString('fr-FR', { weekday:'short', day:'numeric', month:'short' });
const fmtS = s => D8(s).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
const fmtLong = s => D8(s).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
const round1 = v => v == null ? null : Math.round(v*10)/10;

/* =====================================================================
   ÉTAT & PERSISTANCE  (cloud par utilisateur + miroir local)
   ===================================================================== */
const LS_KEY = 'hb-carnet-v2';
function freshState() {
  return {
    v:2, updatedAt: 0, onboarded:false, createdAt: today(),
    profile:{ age:29, weight:87, height:180, post:'Ailier', level:'Haut régional / Luxembourg', vma:'', notesKine:'' },
    settings:{
      startDate: mondayOf(today()),
      days:{ A:0, B:2, C:6, D:4 }, daysV:2,
      collective:{ week:9, days:[1,3], duration:90 },
      thresholds: clone(DEFAULT_THRESHOLDS),
      thresholdsValidated:{ by:'', date:'' },
      objectives:{ collective:'Reprise progressive des entraînements collectifs à 8 semaines (S9)', final:'Retrouver une condition physique spécifique handball au poste d’ailier' }
    },
    exo:{}, levels:{ court:0, long:0, proprio:1, appuis:1, agilite:1 },
    custom:{}, criteria: Object.fromEntries(Object.entries(DEFAULT_CRITERIA).map(([p, list]) => [p, list.map(l => ({ id:uid(), label:l, status:'todo', date:'', comment:'' }))])),
    phase:{ history:[{ phase:1, startWeek:1, validatedAt:'', comment:'' }] },
    decisions:[], moves:{}, slotStatus:{}, events:[], bilans:{}
  };
}
const REAL = { state: freshState(), logs: [], checkins: {}, active: null };
let DEMO = null;
const DB = () => DEMO || REAL;
const ST = () => DB().state;

const Sync = { mode:'local', db:null, uid:null, status:'local', timers:{}, writing:{}, queued:{}, err:null };

function saveLocal() {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ state:REAL.state, logs:REAL.logs, checkins:REAL.checkins, active:REAL.active, activeU:REAL.activeU || 0 })); } catch (e) {}
}
function loadLocal() {
  try { const d = JSON.parse(localStorage.getItem(LS_KEY)); if (d && d.state) return d; } catch (e) {}
  return null;
}
/* Marque un document comme modifié : 'core' | 'checkins' | 'active' | 's_<id>' | '-s_<id>' (suppression) */
function persist(...docs) {
  if (DEMO) return; // la démo n'est jamais enregistrée
  REAL.state.updatedAt = Date.now();
  if (docs.includes('active')) REAL.activeU = Date.now();
  saveLocal();
  if (typeof ghSchedule === 'function' && GH.on()) { ghSchedule(); return; }
  if (Sync.mode !== 'cloud') return;
  docs.push('core');
  [...new Set(docs)].forEach(d => {
    clearTimeout(Sync.timers[d]);
    Sync.timers[d] = setTimeout(() => cloudWrite(d), d === 'active' ? 1500 : 700);
  });
  setSync('saving');
}
function docBody(d) {
  if (d === 'core') return { state: REAL.state, updatedAt: REAL.state.updatedAt };
  if (d === 'checkins') return { days: REAL.checkins };
  if (d === 'active') return { run: REAL.active };
  if (d.startsWith('s_')) { const l = REAL.logs.find(x => 's_' + x.id === d); return l ? { log: l } : null; }
}
async function cloudWrite(d) {
  if (Sync.writing[d]) { Sync.queued[d] = true; return; }
  Sync.writing[d] = true;
  try {
    const ref = Sync.db.collection('data/users/' + Sync.uid).doc(d.replace(/^-/, ''));
    if (d.startsWith('-')) await ref.delete();
    else { const b = docBody(d); if (b) await ref.set(JSON.parse(JSON.stringify(b))); }
    Sync.err = null;
  } catch (e) {
    Sync.err = e && e.code;
    if (e && e.code === 'unavailable') setTimeout(() => cloudWrite(d), 1500 + Math.random()*1500);
    if (e && ['revoked','not_granted','capability_disabled','invalid_argument'].includes(e.code)) { Sync.mode = 'local'; }
  }
  Sync.writing[d] = false;
  if (Sync.queued[d]) { Sync.queued[d] = false; return cloudWrite(d); }
  if (!Object.values(Sync.writing).some(Boolean)) setSync(Sync.err ? 'error' : 'ok');
}
function setSync(s) { Sync.status = s; ['sync','sync-m'].forEach(i => { const el = document.getElementById(i); if (el) el.innerHTML = syncBadge(); }); }

async function initCloud() {
  if (!window.claude || !window.claude.use || (typeof GH !== 'undefined' && GH.on())) return;
  const timeout = new Promise(r => setTimeout(() => r(null), 10000));
  try {
    const [db, user] = await Promise.race([Promise.all([window.claude.use('db'), window.claude.use('user')]), timeout.then(() => [null, null])]);
    if (!db || !user) return;
    const id = await user.id(); if (!id) return;
    Sync.db = db; Sync.uid = id;
    setSync('loading');
    const snap = await Promise.race([db.collection('data/users/' + id).get(), timeout]);
    if (!snap) { setSync('error'); return; }
    Sync.mode = 'cloud';
    const docs = {}; snap.docs.forEach(d => docs[d.id] = d.data());
    const cloudCore = docs.core && docs.core.state;
    if (cloudCore && (cloudCore.updatedAt || 0) >= (REAL.state.updatedAt || 0)) {
      REAL.state = migrate(clone(cloudCore));
      REAL.checkins = clone((docs.checkins && docs.checkins.days) || {});
      REAL.active = clone((docs.active && docs.active.run) || null);
      REAL.logs = Object.entries(docs).filter(([k]) => k.startsWith('s_')).map(([, v]) => clone(v.log)).filter(Boolean);
      saveLocal(); setSync('ok'); render();
    } else if (REAL.state.onboarded || REAL.logs.length) {
      // données locales plus récentes ou cloud vide : on pousse tout
      persist('core', 'checkins', 'active', ...REAL.logs.map(l => 's_' + l.id));
    } else setSync('ok');
  } catch (e) { Sync.mode = 'local'; setSync('error'); }
}
function migrate(s) {
  const f = freshState();
  const m = { ...f, ...s, settings:{ ...f.settings, ...(s.settings||{}) }, profile:{ ...f.profile, ...(s.profile||{}) }, levels:{ ...f.levels, ...(s.levels||{}) } };
  if (!s.settings || !s.settings.daysV) { m.settings.days = { A:0, B:2, C:6, D:4 }; m.settings.daysV = 2; }
  m.settings.thresholds = { ...f.settings.thresholds, ...(s.settings && s.settings.thresholds || {}) };
  return m;
}
(function boot() { const l = loadLocal(); if (l) { REAL.state = migrate(l.state); REAL.logs = l.logs || []; REAL.checkins = l.checkins || {}; REAL.active = l.active || null; REAL.activeU = l.activeU || 0; } })();

/* =====================================================================
   CALENDRIER DU PROGRAMME & PHASES
   ===================================================================== */
const calWeek = (date = today()) => Math.max(1, Math.floor(diffDays(date, ST().settings.startDate) / 7) + 1);
const weekStart = w => addDays(ST().settings.startDate, (w-1)*7);
const curPhaseEntry = () => ST().phase.history[ST().phase.history.length - 1];

/* Phase d'une semaine : réelle pour le passé/présent, projetée pour le futur (jamais d'avance automatique) */
function phaseOfWeek(w) {
  const h = ST().phase.history, cw = calWeek();
  if (w <= cw) {
    const e = [...h].reverse().find(x => x.startWeek <= w) || h[0];
    return { phase:e.phase, idx: w - e.startWeek + 1, projected:false };
  }
  let p = curPhaseEntry().phase, s = curPhaseEntry().startWeek;
  let end = Math.max(s + 3, cw);
  while (w > end && p < 4) { p++; s = end + 1; end = s + 3; }
  return { phase:p, idx: w - s + 1, projected:true };
}
function weekInfo(w) {
  const pi = phaseOfWeek(w);
  return { ...pi, w, deload: pi.idx === 4, bilan: pi.idx === 4, extended: pi.idx > 4, start: weekStart(w) };
}
function slotId(w, k) { return `w${w}-${k}`; }
function parseSlot(id) { const m = /^w(\d+)-([A-D])$/.exec(id); return m ? { w:+m[1], key:m[2] } : null; }

function collectivesOfWeek(w) {
  const s = weekStart(w), e = addDays(s, 6);
  return ST().events.filter(ev => ev.type === 'collectif' && ev.date >= s && ev.date <= e);
}
/* Remplacement progressif par le collectif : phase 3 sem. 1-2 → 1 séance (D), ensuite 2 (D puis B) */
function replacedKeys(w) {
  const wi = weekInfo(w); if (wi.phase < 3) return [];
  const n = collectivesOfWeek(w).length; if (!n) return [];
  const max = wi.phase === 3 && wi.idx <= 2 ? 1 : 2;
  return ['D','B'].filter(k => ST().slotStatus[slotId(w,k)] !== 'keep').slice(0, Math.min(n, max));
}
function slot(w, key) {
  const st = ST(), id = slotId(w, key);
  const planned = addDays(weekStart(w), st.settings.days[key]);
  const mv = st.moves[id];
  const date = mv ? mv.date : planned;
  const log = DB().logs.filter(l => l.slot === id).sort((a,b) => (b.end||0) - (a.end||0))[0];
  let status = 'planned';
  if (log) status = log.status;
  else if (st.slotStatus[id] === 'missed') status = 'missed';
  else if (st.slotStatus[id] === 'replaced' || replacedKeys(w).includes(key)) status = 'replaced';
  else if (date < today() && date >= (st.createdAt || '0')) status = 'missed';
  else if (date === today()) status = 'today';
  return { id, w, key, date, planned, moved: !!mv, postponed: !!mv && mv.date > planned, status, log, meta: SESSIONS[key], info: weekInfo(w) };
}
function weekSlots(w) { return ['A','B','C','D'].map(k => slot(w, k)); }
const STATUS = {
  planned:   { l:'Prévue', c:'text-txt-2 bg-ink-3', i:'○' },
  today:     { l:'Aujourd’hui', c:'text-ink-0 bg-blue', i:'●' },
  done:      { l:'Terminée', c:'text-ink-0 bg-good', i:'✓' },
  incomplete:{ l:'Incomplète', c:'text-ink-0 bg-warn', i:'◐' },
  missed:    { l:'Non effectuée', c:'text-bad bg-bad/15', i:'✕' },
  replaced:  { l:'Remplacée (collectif)', c:'text-blue bg-blue/15', i:'⇄' }
};

/* Charge mécanique mollets : A, B, D, collectifs, bilans */
function calfEventsAround(date, excludeId) {
  const out = [];
  for (let d = -1; d <= 1; d++) {
    const day = addDays(date, d);
    eventsOn(day).forEach(e => { if (e.calf && e.id !== excludeId) out.push({ ...e, day }); });
  }
  return out;
}
function eventsOn(day) {
  const w = calWeek(day), out = [];
  const cands = [w-1, w, w+1].filter(x => x >= 1);
  cands.forEach(ww => ['A','B','C','D'].forEach(k => {
    const s = slot(ww, k);
    if (s.date === day && s.status !== 'replaced') out.push({ type:'session', id:s.id, slot:s, calf:SESSIONS[k].calf, label:SESSIONS[k].name });
  }));
  DB().logs.filter(l => l.key === 'X' && l.date === day).forEach(l => out.push({ type:'free', id:l.id, log:l, calf: !!(l.extra && FREE_TYPES[l.extra.type].calf), label: logTitle(l) }));
  ST().events.filter(e => e.date === day).forEach(e => out.push({ type:e.type, id:e.id, ev:e, calf: e.type === 'collectif' || e.type === 'bilan', label: e.type === 'collectif' ? 'Entraînement collectif' : e.type === 'bilan' ? 'Bilan fonctionnel' : 'Repos' }));
  return out;
}
function suggestDates(slotObj) {
  const res = [];
  for (let d = 0; d <= 9 && res.length < 4; d++) {
    const day = addDays(slotObj.planned > today() ? slotObj.planned : today(), d);
    if (day === slotObj.date) continue;
    if (!SESSIONS[slotObj.key].calf || !calfEventsAround(day, slotObj.id).length) res.push(day);
  }
  return res;
}

/* =====================================================================
   PRESCRIPTIONS
   ===================================================================== */
function sessionItems(phase, key) {
  const c = ST().custom[phase] && ST().custom[phase][key];
  return c || BLUEPRINT[phase][key];
}
function exState(id) { return ST().exo[id] || {}; }
function curLoad(id) { const e = EX[id], s = exState(id); return s.load != null ? s.load : e.load; }
function curReps(id) { const s = exState(id); return s.reps != null ? s.reps : (REPS_START[id] || 10); }
function familyLevel(f, phase) { return Math.min(ST().levels[f] || 1, FAMILY_MAX[f][phase]); }
function prescribe(item, wi) {
  const [id, sets0, reps0, rpe, rest] = item; const ex = EX[id];
  const sets = ex.kind === 'strength' || ex.kind === 'time' ? Math.max(1, sets0 - (wi.deload && sets0 > 1 ? 1 : 0)) : sets0;
  const p = { id, ex, sets, rpe, rest, kind: ex.kind };
  if (ex.kind === 'strength') {
    if (ex.repsProg) { p.reps = curReps(id); p.load = null; p.text = `${sets} × ${p.reps} ${ex.unit}`; }
    else { p.reps = reps0; p.load = curLoad(id); p.text = `${sets} × ${reps0} @ ${p.load} ${ex.unit}`; }
  } else if (ex.kind === 'time') { p.reps = curLoad(id); p.text = `${sets} × ${p.reps} s`; }
  else if (ex.kind === 'ladder') {
    const i = Math.min(ST().levels[ex.ladder] || 0, LADDERS[ex.ladder].length - 1); const st = LADDERS[ex.ladder][i];
    p.step = i; p.ladder = st; p.sets = st.blocks; p.text = `Palier ${i+1}/${LADDERS[ex.ladder].length} · ${st.f}`; p.target = ladderTarget(st, +ST().profile.vma);
  } else if (ex.kind === 'level') {
    const lv = familyLevel(ex.family, wi.phase); p.level = lv; p.drills = FAMILIES[ex.family].levels[lv-1].drills;
    p.text = `Niveau ${lv} · ${LEVEL_NAMES[lv-1]}`; p.sets = p.drills.length;
  } else { const t0 = ex.tech.split(/[.:,]/)[0]; p.text = t0.length > 48 ? t0.slice(0, 46).trim() + '…' : t0; p.sets = 1; }
  p.rpeText = `RPE cible ${rpe}`;
  return p;
}
function slotPlan(s) { return sessionItems(s.info.phase, s.key).map(it => prescribe(it, s.info)); }

/* =====================================================================
   VIGILANCE
   ===================================================================== */
const TH = () => ST().settings.thresholds;
function level(v, t) {
  if (v == null || v === '') return 'green';
  if (t.dir === 'down') return v <= t.r ? 'red' : v <= t.o ? 'orange' : 'green';
  return v >= t.r ? 'red' : v >= t.o ? 'orange' : 'green';
}
const worst = arr => arr.includes('red') ? 'red' : arr.includes('orange') ? 'orange' : arr.includes('unknown') ? 'unknown' : 'green';
function checkinFor(date) { return DB().checkins[date] || null; }
function latestCheckin() {
  const d = Object.keys(DB().checkins).sort().reverse()[0];
  return d ? { date:d, ...DB().checkins[d] } : null;
}
function watchBaseline(date, key) {
  const vals = []; for (let i = 1; i <= 7; i++) { const c = checkinFor(addDays(date, -i)); const v = c && c.gen && c.gen[key]; if (v) vals.push(+v); }
  return vals.length >= 4 ? avg(vals) : null;
}
function watchSignals(date, ci) {
  const out = [], g = (ci && ci.gen) || {}, t = TH();
  const bR = watchBaseline(date, 'rhr'), bH = watchBaseline(date, 'hrv');
  if (g.rhr && bR != null) { const d = Math.round(g.rhr - bR); if (level(d, t.rhrDelta) !== 'green') out.push(`FC repos ${g.rhr} bpm (+${d} vs moy. 7 j)`); }
  if (g.hrv && bH != null) { const d = Math.round((bH - g.hrv) / bH * 100); if (level(d, t.hrvDrop) !== 'green') out.push(`VFC ${g.hrv} ms (−${d} % vs moy. 7 j)`); }
  return out;
}
function zoneVigilance(zone, ci, prev) {
  const t = TH(), r = [];
  if (!ci) return { level:'unknown', reasons:['Pas de suivi renseigné'] };
  if (zone === 'calfL' || zone === 'calfR') {
    const z = ci[zone] || {}, pz = prev && prev[zone];
    const push = (lv, txt) => { if (lv !== 'green') r.push([lv, txt]); };
    push(level(z.pain, t.calfPain), `Douleur ${z.pain}/10`);
    push(level(z.stiff, t.calfStiff), `Raideur matinale ${z.stiff}/10`);
    if (pz && z.pain != null && pz.pain != null) push(level(z.pain - pz.pain, t.calfDelta), `Douleur en hausse de ${z.pain - pz.pain} pt(s) en 24 h`);
    ['tolRun','tolJump','tolStr'].forEach(k => { if (z[k] === 'mauvaise') r.push(['orange', `Tolérance ${({tolRun:'à la course',tolJump:'aux sauts',tolStr:'au renforcement'})[k]} mauvaise`]); });
  } else if (zone === 'shoulder') {
    const z = ci.shoulder || {};
    if (level(z.pain, t.shPain) !== 'green') r.push([level(z.pain, t.shPain), `Douleur ${z.pain}/10`]);
    if (level(z.stab, t.shStab) !== 'green') r.push([level(z.stab, t.shStab), `Stabilité ${z.stab}/10`]);
    if (z.tolStr === 'mauvaise') r.push(['orange', 'Tolérance au renforcement mauvaise']);
  } else if (zone === 'gen') {
    const z = ci.gen || {};
    if (level(z.fatigue, t.fatigue) !== 'green') r.push([level(z.fatigue, t.fatigue) === 'red' ? 'orange' : 'orange', `Fatigue ${z.fatigue}/10`]);
    if (level(z.sleep, t.sleep) !== 'green') r.push(['orange', `Sommeil ${z.sleep}/10`]);
    if (ci._date) watchSignals(ci._date, ci).forEach(x => r.push(['orange', x]));
  }
  return { level: worst(r.map(x => x[0])), reasons: r.map(x => x[1]) };
}
function vigilanceToday() {
  const t = today(); let ci = checkinFor(t), date = t, stale = false;
  if (!ci) { const y = addDays(t, -1); if (checkinFor(y)) { ci = checkinFor(y); date = y; stale = true; } }
  const prev = ci ? checkinFor(addDays(date, -1)) : null;
  if (ci) ci = { ...ci, _date: date };
  const z = { calfL: zoneVigilance('calfL', ci, prev), calfR: zoneVigilance('calfR', ci, prev), shoulder: zoneVigilance('shoulder', ci, prev), gen: zoneVigilance('gen', ci, prev) };
  const calf = { level: worst([z.calfL.level, z.calfR.level]), reasons: [...z.calfL.reasons.map(x => 'Mollet G : ' + x), ...z.calfR.reasons.map(x => 'Mollet D : ' + x)] };
  return { date, stale, ci, zones:z, calf, global: ci ? worst([z.calfL.level, z.calfR.level, z.shoulder.level, z.gen.level]) : 'unknown' };
}
function exVigilance(ex, vg) {
  if (!ex.zone) return { level: vg.global === 'unknown' ? 'unknown' : 'green', reasons:[] };
  if (vg.global === 'unknown') return { level:'unknown', reasons:['Check-in du jour manquant'] };
  return ex.zone === 'calf' ? vg.calf : vg.zones.shoulder;
}
const VIG = {
  green:  { l:'Vert', t:'Compatible avec le programme prévu', c:'good', i:'✓' },
  orange: { l:'Orange', t:'Vigilance : adaptation et réévaluation', c:'warn', i:'!' },
  red:    { l:'Rouge', t:'Arrêt de l’exercice concerné · avis médical si nécessaire', c:'bad', i:'✕' },
  unknown:{ l:'À renseigner', t:'Fais ton suivi du jour', c:'txt-3', i:'?' }
};

/* =====================================================================
   AUTORÉGULATION
   ===================================================================== */
function zonePainOn(zone, date) {
  const c = checkinFor(date); if (!c) return null;
  if (zone === 'calf') { const a = [c.calfL && c.calfL.pain, c.calfR && c.calfR.pain].filter(v => v != null); return a.length ? Math.max(...a) : null; }
  if (zone === 'shoulder') return c.shoulder ? c.shoulder.pain : null;
  return null;
}
function after(zone, date) {
  const pre = zonePainOn(zone, date) ?? zonePainOn(zone, addDays(date, -1));
  const h24 = zonePainOn(zone, addDays(date, 1)), h48 = zonePainOn(zone, addDays(date, 2));
  const t = zone === 'calf' ? TH().calfPain : TH().shPain;
  const res = { pre, h24, h48, level:'green', reasons:[] };
  [[h24,'24 h'],[h48,'48 h']].forEach(([v, l]) => { if (v != null) { const lv = level(v, t); if (lv !== 'green') { res.level = worst([res.level, lv]); res.reasons.push(`Douleur ${v}/10 à ${l}`); } } });
  if (zone === 'calf' && pre != null && h24 != null && h24 - pre >= TH().calfDelta.o) { res.level = worst([res.level, 'orange']); res.reasons.push(`Douleur +${h24 - pre} à 24 h`); }
  return res;
}
function exHistory(id, withFree = false) {
  return DB().logs.filter(l => l.ex && l.ex[id] && l.ex[id].touched && (withFree || l.key !== 'X')).sort((a,b) => a.date.localeCompare(b.date) || (a.end||0) - (b.end||0))
    .map(l => ({ log:l, e:l.ex[id] }));
}
function assessEntry(id, h) {
  const ex = EX[id], e = h.e, p = e.pres || {}, out = { ok:true, why:[] };
  const sets = e.sets || [];
  const done = sets.filter(s => s.done);
  if (ex.kind === 'strength' || ex.kind === 'time') {
    if (done.length < (p.sets || sets.length)) { out.ok = false; out.why.push(`${done.length}/${p.sets} séries validées`); }
    if (ex.kind === 'strength' && !ex.repsProg && p.load != null && done.some(s => +s.load < p.load)) { out.ok = false; out.why.push('Charge inférieure à la charge prévue'); }
    if (done.some(s => +s.reps < (p.reps || 0))) { out.ok = false; out.why.push('Répétitions/durée cibles non atteintes'); }
  } else if (ex.kind === 'ladder' || ex.kind === 'level') {
    if (done.length < sets.length) { out.ok = false; out.why.push(`${done.length}/${sets.length} blocs réalisés`); }
  }
  if (e.rpe == null) { out.ok = false; out.why.push('RPE non renseigné'); }
  else if (e.rpe > (p.rpe || 10) + (ex.kind === 'ladder' ? 1 : 0)) { out.ok = false; out.why.push(`RPE ${e.rpe} > cible ${p.rpe}`); }
  if (e.tech == null) { out.ok = false; out.why.push('Qualité technique non renseignée'); }
  else if (e.tech === 3 || (ex.inj && e.tech !== 1)) { out.ok = false; out.why.push(ex.inj ? 'Exécution non parfaitement propre (exigée pour un exercice lié à une blessure)' : 'Technique dégradée'); }
  if (e.pain && e.pain.level >= TH().sessionPain.o) { out.ok = false; out.why.push(`Douleur ${e.pain.level}/10 pendant l’exercice`); }
  if (ex.zone) {
    const a = after(ex.zone, h.log.date); out.after = a;
    if (a.level !== 'green') { out.ok = false; out.why.push(...a.reasons); }
    if ((ex.inj || ex.impact || ex.kind === 'ladder') && (a.h24 == null || a.h48 == null)) out.waiting = true;
  }
  return out;
}
function nextValue(id, dir) {
  const ex = EX[id], st = ST();
  if (ex.kind === 'ladder') { const cur = st.levels[ex.ladder] || 0; return Math.max(0, Math.min(LADDERS[ex.ladder].length - 1, cur + dir)); }
  if (ex.kind === 'level') { return Math.max(1, Math.min(5, (st.levels[ex.family] || 1) + dir)); }
  if (ex.kind === 'time') return Math.max(10, Math.min(90, curLoad(id) + dir * ex.step));
  if (ex.repsProg) return Math.max(REPS_START[id] || 1, Math.min(REPS_MAX[id] || 99, curReps(id) + dir));
  return Math.max(0, round1(curLoad(id) + dir * (exState(id).step || ex.step)));
}
function curValue(id) {
  const ex = EX[id], st = ST();
  if (ex.kind === 'ladder') return st.levels[ex.ladder] || 0;
  if (ex.kind === 'level') return st.levels[ex.family] || 1;
  if (ex.kind === 'time') return curLoad(id);
  return ex.repsProg ? curReps(id) : curLoad(id);
}
function fmtValue(id, v) {
  const ex = EX[id];
  if (ex.kind === 'ladder') return `palier ${v+1}`;
  if (ex.kind === 'level') return `niveau ${v} (${LEVEL_NAMES[v-1]})`;
  if (ex.kind === 'time') return `${v} s`;
  return ex.repsProg ? `${v} ${ex.unit}` : `${v} ${ex.unit}`;
}
function proposal(id) {
  const ex = EX[id]; if (!['strength','time','ladder','level'].includes(ex.kind)) return null;
  const hist = exHistory(id); if (!hist.length) return null;
  const last = hist[hist.length-1], la = assessEntry(id, last);
  const need = exState(id).need || (ex.inj ? 3 : 2);
  const cur = curValue(id), base = { id, key: id + '@' + last.log.id, date:last.log.date, cur, need };
  const vg = vigilanceToday(), zv = exVigilance(ex, vg);
  // 3. revenir / réévaluer
  if ((last.e.pain && last.e.pain.level >= TH().sessionPain.r) || (la.after && la.after.level === 'red'))
    return { ...base, action:'down', next: nextValue(id, -1), why:['Signal rouge : ' + [...(last.e.pain && last.e.pain.level >= TH().sessionPain.r ? [`douleur ${last.e.pain.level}/10 pendant l’exercice`] : []), ...((la.after && la.after.reasons) || [])].join(', '), 'Revenir au palier précédent et demander une réévaluation au kiné.'] };
  const fails = []; for (let i = hist.length-1; i >= 0 && fails.length < 2; i--) { const a = assessEntry(id, hist[i]); if (!a.ok && !a.waiting) fails.push(a); else break; }
  if (la.after && la.after.level === 'orange') return { ...base, action:'down', next: nextValue(id, -1), why:['Symptômes en hausse après la séance : ' + la.after.reasons.join(', '), 'Proposition : revenir au palier précédent, ou maintenir après réévaluation.'] };
  if (fails.length >= 2) return { ...base, action:'down', next: nextValue(id, -1), why:['Deux séances consécutives non validées : ' + fails[0].why.join(', ')] };
  // 1. maintenir
  if (la.waiting) return { ...base, action:'wait', why:['En attente des sensations à 24 h et 48 h (suivi quotidien) avant toute décision.'] };
  if (!la.ok) return { ...base, action:'hold', why:['Dernière séance non validée : ' + la.why.join(', ')] };
  const pv = e => { const q = e.pres || {}; return ex.kind === 'ladder' ? q.step : ex.kind === 'level' ? q.level : (ex.kind === 'time' || ex.repsProg) ? q.reps : q.load; };
  let streak = 0; for (let i = hist.length-1; i >= 0; i--) { if (pv(hist[i].e) != cur) break; const a = assessEntry(id, hist[i]); if (a.ok && !a.waiting) streak++; else break; }
  if (zv.level === 'orange' || zv.level === 'red') return { ...base, action:'hold', why:['Vigilance ' + VIG[zv.level].l.toLowerCase() + ' sur la zone concernée : progression gelée.'] };
  const wi = weekInfo(calWeek());
  if (wi.deload) return { ...base, action:'hold', why:['Semaine d’allègement et de bilan : maintien volontaire.'] };
  if (streak < need) return { ...base, action:'hold', why:[`${streak} séance(s) validée(s) d’affilée sur ${need} nécessaires${ex.inj ? ' (règle renforcée : exercice lié à une blessure)' : ''}.`] };
  // 2. progresser
  const nx = nextValue(id, 1);
  if (ex.kind === 'level' && nx > FAMILY_MAX[ex.family][wi.phase]) return { ...base, action:'hold', why:[`Niveau maximal autorisé en phase ${wi.phase} (charge mécanique). Passage possible après validation de la phase.`] };
  if (nx === cur) return { ...base, action:'max', why:[ex.repsProg ? 'Répétitions maximales atteintes : passer à une variante plus difficile (élastique supérieur, charge).' : 'Dernier palier atteint.'] };
  return { ...base, action:'up', next:nx, why:[`${streak} séances validées d’affilée (≥ ${need})`, 'Séries et répétitions complètes, RPE dans la cible, technique propre', ...(ex.zone ? ['Sensations à 24 h et 48 h sans aggravation'] : [])] };
}
function allProposals() {
  const ids = new Set(); [1,2,3,4].forEach(p => ['A','B','C','D'].forEach(k => sessionItems(p,k).forEach(it => ids.add(it[0]))));
  const decided = new Set(ST().decisions.map(d => d.key));
  return [...ids].map(proposal).filter(p => p && ['up','down'].includes(p.action) && !decided.has(p.key));
}
function applyValue(id, v) {
  const ex = EX[id], st = ST();
  if (ex.kind === 'ladder') st.levels[ex.ladder] = v;
  else if (ex.kind === 'level') st.levels[ex.family] = v;
  else { st.exo[id] = { ...(st.exo[id]||{}) }; if (ex.repsProg) st.exo[id].reps = v; else st.exo[id].load = v; }
}

/* =====================================================================
   STATISTIQUES
   ===================================================================== */
function logLoad(l) { return Math.round((l.durMin || 0) * (l.rpe || 0)); }
function weekStats(w) {
  const s = weekStart(w), e = addDays(s, 6);
  const logs = DB().logs.filter(l => l.date >= s && l.date <= e);
  const coll = ST().events.filter(ev => ev.type === 'collectif' && ev.done && ev.date >= s && ev.date <= e);
  let km = 0, court = 0, long = 0, tonnage = 0;
  logs.forEach(l => Object.entries(l.ex || {}).forEach(([id, x]) => {
    const ex = EX[id]; if (!ex) return;
    if (ex.run) { km += +x.km || 0; if (ex.ladder === 'court') court += +x.min || 0; else long += +x.min || 0; }
    (x.sets || []).forEach(st => { if (st.done && st.load && ex.kind === 'strength' && !ex.repsProg) tonnage += st.load * st.reps; });
  }));
  logs.filter(l => l.key === 'X' && l.extra).forEach(l => { if (l.extra.type === 'run') km += +l.extra.km || 0; });
  const persoLoad = logs.reduce((a, l) => a + logLoad(l), 0);
  const collLoad = coll.reduce((a, c) => a + (c.duration||0) * (c.rpe||0), 0);
  const rpes = logs.map(l => l.rpe).filter(Boolean);
  const cis = Object.entries(DB().checkins).filter(([d]) => d >= s && d <= e).map(([,c]) => c);
  return { w, km: round1(km), court, long, tonnage: Math.round(tonnage), persoLoad, collLoad, load: persoLoad + collLoad, collMin: coll.reduce((a,c)=>a+(c.duration||0),0),
    rpe: round1(avg(rpes)), sessions: logs.length, fatigue: round1(avg(cis.map(c => c.gen && c.gen.fatigue).filter(v => v != null))),
    painCalf: round1(avg(cis.map(c => Math.max((c.calfL||{}).pain||0, (c.calfR||{}).pain||0)))), painSh: round1(avg(cis.map(c => (c.shoulder||{}).pain).filter(v => v != null))) };
}
function programProgress() {
  let done = 0, total = 0;
  for (let w = 1; w <= 16; w++) ['A','B','C','D'].forEach(k => {
    total++; const s = slot(w, k);
    if (s.status === 'done') done++; else if (s.status === 'incomplete') done += 0.5;
    else if (s.status === 'replaced' && collectivesOfWeek(w).some(c => c.done)) done++;
  });
  const crit = Object.values(ST().criteria).flat();
  const cOk = crit.filter(c => c.status === 'ok').length;
  return { pct: Math.round((done + cOk) / (total + crit.length) * 100), done, total, cOk, cTotal: crit.length };
}
