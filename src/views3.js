/* =====================================================================
   BLESSURES & RÉCUPÉRATION
   ===================================================================== */
const TOL = [['bonne','Bonne','good'],['moyenne','Moyenne','warn'],['mauvaise','Mauvaise','bad'],['nt','Non testée']];
const SENS = [['normale','Normale','good'],['tension','Tension','warn'],['fatigue','Fatigue','warn'],['douleur','Douleur','bad']];
function emptyCi() { return { calfL:{}, calfR:{}, shoulder:{}, gen:{} }; }
function vCare() {
  const date = ui.ciDate || today();
  if (!ui.ci || ui.ciFor !== date) { ui.ci = clone(checkinFor(date) || emptyCi()); ui.ciFor = date; }
  const c = ui.ci, saved = !!checkinFor(date), prev = checkinFor(addDays(date, -1));
  const vz = z => zoneVigilance(z, saved ? { ...checkinFor(date), _date: date } : null, prev);
  const lastLog = [...DB().logs].sort((a,b) => b.date.localeCompare(a.date))[0];
  const recent = DB().logs.filter(l => [1,2].includes(diffDays(date, l.date))).map(l => `${logTitle(l)} (${diffDays(date, l.date) === 1 ? '24 h' : '48 h'})`);
  const tv = ST().settings.thresholdsValidated;
  const calf = (z, name, note) => card(`${h2(`${name} <span class="text-txt-3 text-sm font-sans font-normal">${note}</span>`, saved ? vigChip(vz(z).level) : '')}
    <div class="grid sm:grid-cols-2 gap-4">${slider(`${z}.pain`, c[z].pain, { label:'Douleur quotidienne', hint:'0 aucune|10 maximale' })}${slider(`${z}.stiff`, c[z].stiff, { label:'Raideur matinale', hint:'0 aucune|10 très raide' })}</div>
    <div class="mt-3"><div class="lbl">Sensation musculaire</div>${chips(`ci:${z}.sens`, c[z].sens, SENS, 'grid grid-cols-4')}</div>
    <div class="grid sm:grid-cols-3 gap-3 mt-3">${[['tolRun','Tolérance à la course'],['tolJump','Tolérance aux sauts'],['tolStr','Tolérance au renforcement']].map(([k,l]) => `<div><div class="lbl">${l}</div>${chips(`ci:${z}.${k}`, c[z][k], TOL, 'grid grid-cols-2')}</div>`).join('')}</div>
    ${saved && vz(z).reasons.length ? `<p class="text-xs text-txt-3 mt-3">${vz(z).reasons.join(' · ')}</p>` : ''}`);
  const days30 = Array.from({length:30}, (_, i) => addDays(today(), i-29)), has = days30.some(d => checkinFor(d));
  return `${pageHead('Blessures & récupération', 'Suivi quotidien des zones sensibles et de la récupération. Aucun diagnostic : en cas de doute, avis médical.',
    `<input type="date" data-a="ci-date" value="${date}" max="${today()}" class="inp h-11" aria-label="Date du suivi">`)}
  <main class="px-4 lg:px-8 space-y-4 max-w-5xl fade-in">
    <div class="flex flex-wrap items-center gap-2 text-sm">${saved ? '<span class="chip bg-good/15 text-good">✓ Suivi enregistré pour ce jour (modifiable)</span>' : '<span class="chip bg-ink-3 text-txt-2">Suivi non renseigné</span>'}
      ${recent.length ? `<span class="chip bg-blue/15 text-blue">Sensations après : ${recent.join(', ')}</span>` : ''}
      ${prev && !saved ? `<button data-a="ci-copy" class="text-blue text-sm underline">Reprendre les valeurs de la veille</button>` : ''}</div>
    ${calf('calfL', 'Mollet gauche', 'déchirure fin janvier · presque récupéré')}
    ${calf('calfR', 'Mollet droit', 'déchirure il y a ~11 mois')}
    ${card(`${h2('Épaule droite <span class="text-txt-3 text-sm font-sans font-normal">bras tireur · antécédents d’instabilité</span>', saved ? vigChip(vz('shoulder').level) : '')}
      <div class="grid sm:grid-cols-3 gap-4">${slider('shoulder.stab', c.shoulder.stab, { label:'Sensation de stabilité', hint:'0 instable|10 très stable', invert:true })}${slider('shoulder.pain', c.shoulder.pain, { label:'Douleur', hint:'0 aucune|10 maximale' })}${slider('shoulder.fatigue', c.shoulder.fatigue, { label:'Fatigue', hint:'0 aucune|10 épuisée' })}</div>
      <div class="grid sm:grid-cols-2 gap-3 mt-3"><div><div class="lbl">Tolérance au renforcement</div>${chips('ci:shoulder.tolStr', c.shoulder.tolStr, TOL, 'grid grid-cols-4')}</div>
      <div><div class="lbl">Exercices préventifs réalisés</div>${chips('ci:shoulder.prev', c.shoulder.prev, [['oui','Oui','good'],['non','Non']], 'grid grid-cols-2')}</div></div>`)}
    ${card(`${h2('Récupération générale', saved ? vigChip(vz('gen').level) : '')}
      <div class="grid sm:grid-cols-2 gap-4">${slider('gen.sleep', c.gen.sleep, { label:'Qualité du sommeil', hint:'0 très mauvaise|10 excellente', invert:true })}
        <label><div class="flex justify-between text-sm mb-1"><span>Durée de sommeil</span></div><input type="number" step="0.5" min="0" max="14" data-ci="gen.sleepH" value="${c.gen.sleepH ?? ''}" class="inp w-full" placeholder="heures"></label>
        ${slider('gen.fatigue', c.gen.fatigue, { label:'Fatigue générale', hint:'0 en forme|10 épuisé' })}${slider('gen.motiv', c.gen.motiv, { label:'Motivation', hint:'0 aucune|10 maximale', invert:true })}
        ${slider('gen.recov', c.gen.recov, { label:'Récupération ressentie', hint:'0 pas récupéré|10 totalement', invert:true })}
        <div class="sm:col-span-2 rounded-xl border border-ink-3 p-3"><div class="flex flex-wrap items-baseline justify-between gap-2"><div class="lbl !mb-0">⌚ Données montre (Garmin Connect, au réveil)</div><span class="text-[11px] text-txt-3">Optionnel · indicateurs, jamais décisifs seuls</span></div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">${[['rhr','FC au repos','bpm'],['hrv','VFC nuit (moy.)','ms'],['sleepScore','Score sommeil','/100'],['bb','Body Battery réveil','/100']].map(([k,l,u]) =>
            `<label class="text-xs"><span class="text-txt-3">${l} (${u})</span><input type="number" inputmode="numeric" data-ci="gen.${k}" value="${c.gen[k] ?? ''}" class="inp w-full mt-1"></label>`).join('')}</div>
          ${(() => { const bR = watchBaseline(date, 'rhr'), bH = watchBaseline(date, 'hrv'); return `<p class="text-[11px] text-txt-3 mt-2">${bR != null || bH != null ? `Tes moyennes 7 j : ${bR != null ? 'FC repos ' + Math.round(bR) + ' bpm' : ''}${bR != null && bH != null ? ' · ' : ''}${bH != null ? 'VFC ' + Math.round(bH) + ' ms' : ''}. Alerte orange si FC repos ≥ +${TH().rhrDelta.o} bpm ou VFC ≤ −${TH().hrvDrop.o} %.` : 'Les alertes s’activent après 4 jours de relevés (comparaison à ta propre moyenne 7 jours).'}</p>`; })()}</div>
        <div class="rounded-xl bg-ink-2 p-3 text-sm"><div class="text-txt-3 text-xs">RPE de la dernière séance</div><b>${lastLog ? `${lastLog.rpe ?? '—'} / 10` : '—'}</b>${lastLog ? `<span class="text-txt-3"> · ${logTitle(lastLog)}, ${fmtS(lastLog.date)}</span>` : ''}</div></div>`)}
    <div class="sticky bottom-20 lg:bottom-4 z-20 flex justify-end">${btn(saved ? 'Mettre à jour le suivi' : 'Enregistrer le suivi', 'ci-save', '', 'good')}</div>
    ${card(`${h2('Système de vigilance')}
      <div class="grid sm:grid-cols-3 gap-2 text-sm">${['green','orange','red'].map(l => `<div class="rounded-xl bg-ink-2 p-3">${vigChip(l)}<p class="text-txt-2 mt-1.5">${VIG[l].t}</p></div>`).join('')}</div>
      <p class="text-xs text-txt-3 mt-3">${tv.by ? `Seuils validés par ${esc(tv.by)}${tv.date ? ' le ' + fmtS(tv.date) : ''}.` : '<span class="text-warn">Seuils par défaut, non validés : fais-les valider par ton kiné (Paramètres → Seuils).</span>'} Une douleur faible n’autorise jamais à elle seule à continuer : les critères d’arrêt de chaque exercice priment. Aucune séance n’est remplacée automatiquement.</p>`)}
    ${card(`${h2('Historique des symptômes · 30 jours')}${has ? chartBox('c-pain', { type:'line', labels: days30.map(fmtS), min:0, max:10, int:true, zone: TH().calfPain.o - 1, unit:'/10', series:[
        { name:'Mollet G', color:SERIES[0], values: days30.map(d => ((checkinFor(d)||{}).calfL||{}).pain ?? null) },
        { name:'Mollet D', color:SERIES[1], values: days30.map(d => ((checkinFor(d)||{}).calfR||{}).pain ?? null) },
        { name:'Épaule', color:SERIES[2], values: days30.map(d => ((checkinFor(d)||{}).shoulder||{}).pain ?? null) }] }, 200)
      + `<div class="mt-4">${chartBox('c-stiff', { type:'line', labels: days30.map(fmtS), min:0, max:10, int:true, unit:'/10', series:[
        { name:'Raideur G', color:SERIES[0], values: days30.map(d => ((checkinFor(d)||{}).calfL||{}).stiff ?? null) },
        { name:'Raideur D', color:SERIES[1], values: days30.map(d => ((checkinFor(d)||{}).calfR||{}).stiff ?? null) },
        { name:'Stabilité épaule', color:SERIES[2], values: days30.map(d => ((checkinFor(d)||{}).shoulder||{}).stab ?? null) }] }, 170)}</div>`
      + (days30.some(d => ((checkinFor(d)||{}).gen||{}).rhr || ((checkinFor(d)||{}).gen||{}).hrv) ? `<div class="grid sm:grid-cols-2 gap-4 mt-4"><div><div class="lbl">FC au repos (bpm)</div>${chartBox('c-rhr', { type:'line', connect:true, labels: days30.map(fmtS), unit:'bpm', int:true, series:[{ name:'FC repos', color:SERIES[1], values: days30.map(d => ((checkinFor(d)||{}).gen||{}).rhr || null) }, { name:'Moy. 7 j', color:SERIES[1], dash:true, values: movingAvg(days30.map(d => ((checkinFor(d)||{}).gen||{}).rhr || null), 7) }] }, 150)}</div>
        <div><div class="lbl">VFC nocturne (ms)</div>${chartBox('c-hrv', { type:'line', connect:true, labels: days30.map(fmtS), unit:'ms', int:true, series:[{ name:'VFC', color:SERIES[0], values: days30.map(d => ((checkinFor(d)||{}).gen||{}).hrv || null) }, { name:'Moy. 7 j', color:SERIES[0], dash:true, values: movingAvg(days30.map(d => ((checkinFor(d)||{}).gen||{}).hrv || null), 7) }] }, 150)}</div></div>` : '')
      + `<details class="mt-3"><summary class="text-sm text-blue">Tableau détaillé ▾</summary><div class="overflow-x-auto"><table class="w-full text-xs mt-2"><thead class="text-txt-3"><tr><th class="text-left py-1">Date</th><th>Doul. G</th><th>Rai. G</th><th>Doul. D</th><th>Rai. D</th><th>Épaule</th><th>Stab.</th><th>Fatigue</th><th>Sommeil</th><th>FC rep.</th><th>VFC</th></tr></thead><tbody>
        ${days30.slice().reverse().filter(d => checkinFor(d)).map(d => { const x = checkinFor(d); return `<tr class="border-t border-ink-3 text-center"><td class="text-left py-1.5">${fmtD(d)}</td><td>${x.calfL.pain ?? '—'}</td><td>${x.calfL.stiff ?? '—'}</td><td>${x.calfR.pain ?? '—'}</td><td>${x.calfR.stiff ?? '—'}</td><td>${x.shoulder.pain ?? '—'}</td><td>${x.shoulder.stab ?? '—'}</td><td>${x.gen.fatigue ?? '—'}</td><td>${x.gen.sleep ?? '—'}</td><td>${x.gen.rhr ?? '—'}</td><td>${x.gen.hrv ?? '—'}</td></tr>`; }).join('')}</tbody></table></div></details>`
      : emptyState('Pas encore d’historique', 'Chaque suivi enregistré alimente l’historique et le calcul de la vigilance.')}`)}
  </main>`;
}

/* =====================================================================
   PROGRESSION & STATISTIQUES
   ===================================================================== */
function rangeWeeks(r) {
  const cw = Math.max(1, calWeek()), last = cw;
  if (r === 'last4') return [Math.max(1, last-3), last];
  if (r === 'prev4') return [Math.max(1, last-7), Math.max(1, last-4)];
  if (/^P\d$/.test(r)) { const p = +r[1]; const ws = Array.from({length: Math.max(cw, 16)}, (_, i) => i+1).filter(w => weekInfo(w).phase === p && w <= cw); return ws.length ? [ws[0], ws[ws.length-1]] : null; }
  return [1, last];
}
const RANGES = [['all','Tout le cycle'],['last4','4 dernières sem.'],['prev4','4 semaines précédentes'],['P1','Phase 1'],['P2','Phase 2'],['P3','Phase 3'],['P4','Phase 4']];
function periodKpis(r) {
  const rg = rangeWeeks(r); if (!rg) return null;
  const ws = []; for (let w = rg[0]; w <= rg[1]; w++) ws.push(weekStats(w));
  const n = ws.length || 1;
  return { label: RANGES.find(x => x[0] === r)[1] + ` (S${rg[0]}–S${rg[1]})`, sessions: ws.reduce((a,x)=>a+x.sessions,0), load: Math.round(ws.reduce((a,x)=>a+x.load,0)/n),
    km: round1(ws.reduce((a,x)=>a+x.km,0)/n), tonnage: Math.round(ws.reduce((a,x)=>a+x.tonnage,0)/n), rpe: round1(avg(ws.map(x=>x.rpe).filter(v=>v!=null))),
    fatigue: round1(avg(ws.map(x=>x.fatigue).filter(v=>v!=null))), painCalf: round1(avg(ws.map(x=>x.painCalf).filter(v=>v!=null))), painSh: round1(avg(ws.map(x=>x.painSh).filter(v=>v!=null))), coll: Math.round(ws.reduce((a,x)=>a+x.collMin,0)/n) };
}
function vStats() {
  const rg = rangeWeeks(ui.statsRange) || [1, calWeek()];
  const weeks = []; for (let w = rg[0]; w <= rg[1]; w++) weeks.push(weekStats(w));
  const wl = weeks.map(x => 'S' + x.w);
  const inR = d => { const w = calWeek(d); return w >= rg[0] && w <= rg[1]; };
  const logs = DB().logs.filter(l => inR(l.date)).sort((a,b) => a.date.localeCompare(b.date) || a.end - b.end);
  const days = []; for (let d = weekStart(rg[0]); d <= addDays(weekStart(rg[1]), 6) && d <= today(); d = addDays(d, 1)) days.push(d);
  const strengthIds = Object.keys(EX).filter(id => EX[id].kind === 'strength' && !EX[id].repsProg && EX[id].zone !== 'calf' && exHistory(id, true).length);
  if (!strengthIds.includes(ui.chartEx) && strengthIds.length) ui.chartEx = strengthIds[0];
  const topSeries = id => exHistory(id, true).filter(h => inR(h.log.date)).map(h => ({ d: h.log.date, v: Math.max(0, ...(h.e.sets||[]).filter(s => s.done).map(s => +s.load||0)) })).filter(p => p.v);
  const ex1 = ui.chartEx ? topSeries(ui.chartEx) : [];
  const calfA = topSeries('calf_straight'), calfB = topSeries('calf_bent'), calfDates = [...new Set([...calfA, ...calfB].map(p => p.d))].sort();
  const lvlLogs = logs.filter(l => ['B','D'].includes(l.key) || l.ex.proprio || l.ex.agilite);
  const fat = days.map(d => ((checkinFor(d)||{}).gen||{}).fatigue ?? null);
  const kA = periodKpis(ui.cmp.a || 'prev4'), kB = periodKpis(ui.cmp.b || 'last4');
  const none = !DB().logs.length && !Object.keys(DB().checkins).length;
  const C = (title, inner, extra = '') => card(`${h2(title, extra)}${inner}`);
  const E = t => emptyState('Pas encore de données', t);
  const cmpRow = (k, l, unit = '', lowerBetter = false) => { const a = kA && kA[k], b = kB && kB[k]; const d = a != null && b != null ? round1(b - a) : null;
    return `<tr class="border-t border-ink-3"><td class="py-2">${l}</td><td class="text-right">${a ?? '—'}${a != null ? unit : ''}</td><td class="text-right">${b ?? '—'}${b != null ? unit : ''}</td><td class="text-right ${d == null || d === 0 ? 'text-txt-3' : (d > 0) !== lowerBetter ? 'text-good' : 'text-warn'}">${d == null ? '—' : (d > 0 ? '+' : '') + d}</td></tr>`; };
  return `${pageHead('Progression', 'Tendances, comparaison de périodes et charge d’entraînement (durée × RPE).')}
  <main class="px-4 lg:px-8 space-y-4 max-w-7xl fade-in">
    <div class="scroll-x flex gap-1.5">${RANGES.map(([k,l]) => `<button data-a="range" data-v="${k}" class="shrink-0 min-h-[40px] px-3 rounded-xl text-sm border ${ui.statsRange===k ? 'bg-blue text-white border-blue' : 'border-ink-3 text-txt-2'}">${l}</button>`).join('')}</div>
    ${none ? emptyState('Aucune donnée enregistrée', 'Les graphiques se remplissent avec tes séances et ton suivi quotidien. Pour les découvrir avec des données fictives : Paramètres → Données → Mode démo.') : ''}
    ${card(`${h2('Comparer deux périodes')}
      <div class="grid sm:grid-cols-2 gap-2 mb-3">${['a','b'].map(k => `<label><span class="lbl">Période ${k.toUpperCase()}</span><select data-a="cmp" data-v="${k}" class="inp w-full">${RANGES.map(([v,l]) => `<option value="${v}" ${(ui.cmp[k] || (k==='a'?'prev4':'last4'))===v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`).join('')}</div>
      <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="text-xs text-txt-3"><tr><th class="text-left">Moyenne par semaine</th><th class="text-right">A</th><th class="text-right">B</th><th class="text-right">Écart B−A</th></tr></thead><tbody>
      ${cmpRow('sessions','Séances (total)')}${cmpRow('load','Charge hebdo',' UA')}${cmpRow('km','Course',' km')}${cmpRow('tonnage','Tonnage',' kg')}${cmpRow('coll','Collectif',' min')}${cmpRow('rpe','RPE moyen','',true)}${cmpRow('fatigue','Fatigue moyenne','',true)}${cmpRow('painCalf','Douleur mollets moy.','',true)}${cmpRow('painSh','Douleur épaule moy.','',true)}</tbody></table></div>
      <p class="text-[11px] text-txt-3 mt-2">${kA ? kA.label : ''} vs ${kB ? kB.label : ''}. Vert = évolution favorable, orange = à surveiller.</p>`)}
    <div class="grid lg:grid-cols-2 gap-4">
      ${C('1 · Charges de musculation', ex1.length ? `<div class="scroll-x flex gap-1.5 mb-2">${strengthIds.map(id => `<button data-a="chart-ex" data-v="${id}" class="shrink-0 px-2.5 py-1.5 rounded-lg text-xs border ${ui.chartEx===id ? 'border-blue text-blue' : 'border-ink-3 text-txt-2'}">${EX[id].n.split('(')[0].trim()}</button>`).join('')}</div>
        ${chartBox('s1', { type:'line', labels: ex1.map(p => fmtS(p.d)), unit:'kg', series:[{ name:'Meilleure série', color:SERIES[0], values: ex1.map(p => p.v) }, { name:'Tendance', color:SERIES[0], dash:true, values: movingAvg(ex1.map(p => p.v)) }] })}<div class="mt-1">${trendOf(ex1.map(p => p.v))}</div>` : E('Enregistre une séance de force.'))}
      ${C('2 · Performances mollets', calfDates.length ? chartBox('s2', { type:'line', labels: calfDates.map(fmtS), unit:'kg', series:[
          { name:'Genou tendu', color:SERIES[0], values: calfDates.map(d => (calfA.find(p => p.d === d)||{}).v ?? null) }, { name:'Genou fléchi (soléaire)', color:SERIES[1], values: calfDates.map(d => (calfB.find(p => p.d === d)||{}).v ?? null) }] }) + calfTests() : E('Enregistre une séance A (force bas du corps).'))}
      ${C('3 · Volume de course hebdomadaire', weeks.some(x => x.km) ? chartBox('s3', { type:'bar', labels: wl, unit:'km', series:[{ name:'km', color:SERIES[0], values: weeks.map(x => x.km) }] }) + `<div class="mt-1">${trendOf(weeks.map(x => x.km))}</div>` : E('Saisis les km dans tes séances de fractionné.'))}
      ${C('4 · Répartition fractionné court / long', weeks.some(x => x.court || x.long) ? chartBox('s4', { type:'bar', labels: wl, unit:'min', series:[{ name:'Court', color:SERIES[0], values: weeks.map(x => x.court) }, { name:'Long', color:SERIES[1], values: weeks.map(x => x.long) }] }) : E('Minutes de course saisies dans les séances B et D.'))}
      ${C('5 · Évolution du RPE', logs.length ? chartBox('s5', { type:'line', labels: logs.map(l => fmtS(l.date)), full: logs.map(l => `${fmtD(l.date)} · ${logTitle(l)}`), min:0, max:10, int:true, series:[{ name:'RPE séance', color:SERIES[0], values: logs.map(l => l.rpe) }, { name:'Moyenne mobile (3)', color:SERIES[0], dash:true, values: movingAvg(logs.map(l => l.rpe)) }] }) + `<div class="mt-1">${trendOf(logs.map(l => l.rpe))}</div>` : E('Le RPE global de chaque séance apparaîtra ici.'))}
      ${C('6 · Évolution de la fatigue', fat.some(v => v != null) ? chartBox('s6', { type:'line', labels: days.map(fmtS), min:0, max:10, int:true, series:[{ name:'Fatigue', color:SERIES[1], values: fat }, { name:'Moyenne 7 j', color:SERIES[1], dash:true, values: movingAvg(fat, 7) }] }) + `<div class="mt-1">${trendOf(fat)}</div>` : E('Renseigne la fatigue dans le suivi quotidien.'))}
      ${C('7 · Historique des douleurs', days.some(d => checkinFor(d)) ? chartBox('s7', { type:'line', labels: days.map(fmtS), min:0, max:10, int:true, zone: TH().calfPain.o - 1, unit:'/10', series:[
          { name:'Mollet G', color:SERIES[0], values: days.map(d => ((checkinFor(d)||{}).calfL||{}).pain ?? null) }, { name:'Mollet D', color:SERIES[1], values: days.map(d => ((checkinFor(d)||{}).calfR||{}).pain ?? null) }, { name:'Épaule', color:SERIES[2], values: days.map(d => ((checkinFor(d)||{}).shoulder||{}).pain ?? null) }] }) : E('Le suivi quotidien alimente ce graphique.'))}
      ${C('8 · Progression des paliers', lvlLogs.length ? chartBox('s8a', { type:'line', connect:true, labels: lvlLogs.map(l => fmtS(l.date)), int:true, min:1, series:[
          { name:'Fract. court', color:SERIES[0], values: lvlLogs.map(l => l.ex.court && !l.ex.court.swapped ? l.ex.court.pres.step + 1 : null) }, { name:'Fract. long', color:SERIES[1], values: lvlLogs.map(l => l.ex.long && !l.ex.long.swapped ? l.ex.long.pres.step + 1 : null) }] }, 150)
          + `<div class="mt-3">${chartBox('s8b', { type:'line', connect:true, labels: lvlLogs.map(l => fmtS(l.date)), int:true, min:1, max:5, series: Object.entries(FAMILIES).map(([k, f], i) => ({ name:f.name, color:SERIES[i], values: lvlLogs.map(l => l.ex[k] ? l.ex[k].pres.level : null) })) }, 150)}</div>` : E('Les paliers de fractionné et les niveaux d’agilité apparaîtront ici.'))}
      ${C('9 · Volume des entraînements collectifs', weeks.some(x => x.collMin) ? chartBox('s9', { type:'bar', labels: wl, unit:'min', series:[{ name:'Collectif', color:SERIES[2], values: weeks.map(x => x.collMin) }] }) : E('Ajoute tes entraînements collectifs dans le calendrier (à partir de la reprise).'))}
      ${C('10 · Charge d’entraînement hebdomadaire', weeks.some(x => x.load) ? chartBox('s10', { type:'bar', stacked:true, labels: wl, unit:'UA', series:[{ name:'Séances perso', color:SERIES[0], values: weeks.map(x => x.persoLoad) }, { name:'Collectif', color:SERIES[2], values: weeks.map(x => x.collLoad) }] })
          + `<p class="text-[11px] text-txt-3 mt-2">Charge de séance = durée (min) × RPE global. Évite les hausses brutales d’une semaine à l’autre. ${trendOf(weeks.map(x => x.load))}</p>` : E('Termine une séance avec un RPE global.'))}
    </div>
  </main>`;
}
function calfTests() {
  const rows = Object.entries(ST().bilans).filter(([, b]) => b.results && b.results.calfraise).map(([p, b]) => ({ p, ...b.results.calfraise, date:b.date }));
  if (!rows.length) return `<p class="text-[11px] text-txt-3 mt-2">Les tests de calf raise saisis dans les bilans fonctionnels s’afficheront ici.</p>`;
  return `<table class="w-full text-xs mt-3"><thead class="text-txt-3"><tr><th class="text-left">Bilan</th><th>G</th><th>D</th><th>Symétrie</th></tr></thead><tbody>${rows.map(r => `<tr class="border-t border-ink-3 text-center"><td class="text-left py-1">Phase ${r.p}${r.date ? ' · ' + fmtS(r.date) : ''}</td><td>${r.L ?? '—'}</td><td>${r.R ?? '—'}</td><td>${lsi(r.L, r.R)}</td></tr>`).join('')}</tbody></table>`;
}
const lsi = (a, b) => (a && b) ? Math.round(Math.min(+a, +b) / Math.max(+a, +b) * 100) + ' %' : '—';

/* =====================================================================
   CALENDRIER
   ===================================================================== */
function vCal() {
  const ref = ui.calRef || today();
  const nav = `<div class="flex items-center gap-1.5">${btn('‹', 'cal-nav', 'data-v="-1" aria-label="Précédent"', 'ghost')}${btn('Aujourd’hui', 'cal-nav', 'data-v="0"', 'ghost')}${btn('›', 'cal-nav', 'data-v="1" aria-label="Suivant"', 'ghost')}</div>`;
  const modeSw = `<div class="inline-flex p-1 rounded-xl bg-ink-1 border border-ink-3">${[['week','Semaine'],['month','Mois']].map(([k,l]) => `<button data-a="cal-mode" data-v="${k}" class="px-3.5 py-2 rounded-lg text-sm font-medium ${ui.calMode===k ? 'bg-blue text-white' : 'text-txt-2'}">${l}</button>`).join('')}</div>`;
  const add = `<div class="flex flex-wrap gap-2">${btn('+ Séance effectuée', 'free-new', `data-d="${ui.calRef && ui.calRef <= today() ? ui.calRef : today()}"`)}${btn('+ Entraînement collectif', 'ev-new', 'data-v="collectif"', 'ghost')}${btn('+ Bilan', 'ev-new', 'data-v="bilan"', 'ghost')}${btn('+ Repos', 'ev-new', 'data-v="repos"', 'ghost')}</div>`;
  const legend = `<div class="flex flex-wrap gap-2 text-[11px]">${Object.keys(STATUS).map(statusChip).join('')}<span class="chip bg-blue/15 text-blue">🤾 Collectif</span><span class="chip bg-ink-3 text-txt-2">🩺 Bilan</span><span class="chip bg-ink-3 text-txt-2">⚠ 2 séances « mollets » en 24 h</span></div>`;
  return `${pageHead('Calendrier', ui.calMode === 'week' ? `Semaine ${calWeek(ref)} · ${fmtS(mondayOf(ref))} → ${fmtS(addDays(mondayOf(ref), 6))}` : D8(ref).toLocaleDateString('fr-FR', { month:'long', year:'numeric' }), nav)}
  <main class="px-4 lg:px-8 space-y-3 max-w-7xl fade-in"><div class="flex flex-wrap items-center justify-between gap-3">${modeSw}${add}</div>
    ${ui.calMode === 'week' ? calWeekView(ref) : calMonthView(ref)}${legend}
    <p class="text-xs text-txt-3">Touche une séance pour la déplacer (ou fais-la glisser sur un autre jour sur ordinateur) : seule cette séance bouge, les autres restent en place. L’app signale deux séances exigeantes pour les mollets (A, B, D, collectif, bilan) à moins de 24 h d’intervalle.</p></main>`;
}
function dayItems(day) {
  const items = eventsOn(day).map(e => ({ ...e, warn: e.calf && calfEventsAround(day, e.id).some(x => x.day !== day || x.id !== e.id) }));
  // fantômes des séances déplacées
  const w = calWeek(day);
  [w-1, w, w+1].filter(x => x >= 1).forEach(ww => ['A','B','C','D'].forEach(k => { const s = slot(ww, k); if (s.moved && s.planned === day && s.date !== day) items.push({ type:'ghost', id:s.id, slot:s, label:`${s.meta.short} ${s.postponed ? 'reportée' : 'avancée'} au ${fmtS(s.date)}` }); }));
  // séances remplacées
  [w].forEach(ww => ['A','B','C','D'].forEach(k => { const s = slot(ww, k); if (s.status === 'replaced' && s.date === day) items.push({ type:'replaced', id:s.id, slot:s, label:`${s.meta.short} remplacée` }); }));
  return items;
}
function itemChip(e, compact) {
  if (e.type === 'session') { const s = e.slot, st = STATUS[s.status];
    return `<button data-a="sheet-slot" data-v="${s.id}" ${!s.log ? `draggable="true" data-drag="${s.id}"` : ''} class="${!s.log ? 'cursor-grab active:cursor-grabbing ' : ''}w-full text-left rounded-xl p-2 ${compact ? 'text-[11px] py-1 px-1.5' : 'text-sm'} border ${s.status === 'today' ? 'border-blue bg-blue/10' : 'border-ink-3 bg-ink-2'} hover:border-txt-3">
      <div class="flex items-center gap-1.5"><span class="rounded px-1 ${st.c}">${st.i}</span><b>${s.key}</b><span class="truncate ${compact ? 'hidden sm:inline' : ''}">${compact ? s.meta.short : s.meta.name}</span>${e.warn ? '<span class="text-warn ml-auto" title="Deux séances exigeantes pour les mollets en 24 h">⚠</span>' : ''}</div></button>`; }
  if (e.type === 'free') return `<button data-a="show-log" data-v="${e.id}" class="w-full text-left rounded-xl p-2 ${compact ? 'text-[11px] py-1 px-1.5' : 'text-sm'} border border-good/40 bg-good/10"><div class="flex items-center gap-1.5"><span>${logIcon(e.log)}</span><span class="truncate">${compact ? 'Libre' : esc(e.label)}</span><span class="text-good">✓</span>${e.warn ? '<span class="text-warn ml-auto">⚠</span>' : ''}</div></button>`;
  if (e.type === 'collectif' || e.type === 'bilan' || e.type === 'repos') {
    const ic = { collectif:'🤾', bilan:'🩺', repos:'💤' }[e.type];
    return `<button data-a="sheet-ev" data-v="${e.id}" class="w-full text-left rounded-xl p-2 ${compact ? 'text-[11px] py-1 px-1.5' : 'text-sm'} border ${e.type === 'collectif' ? 'border-blue/40 bg-blue/10' : 'border-ink-3 bg-ink-2'}">
      <div class="flex items-center gap-1.5"><span>${ic}</span><span class="truncate">${compact ? e.label.split(' ')[0] : e.label}</span>${e.ev.done ? '<span class="text-good">✓</span>' : ''}${e.warn ? '<span class="text-warn ml-auto">⚠</span>' : ''}</div></button>`; }
  return `<button data-a="sheet-slot" data-v="${e.id}" class="w-full text-left rounded-xl p-1.5 text-[11px] border border-dashed border-ink-3 text-txt-3 ${compact ? 'hidden sm:block' : ''}">${e.type === 'replaced' ? '⇄ ' : '↷ '}${e.label}</button>`;
}
function calWeekView(ref) {
  const mon = mondayOf(ref);
  return `<div class="grid lg:grid-cols-7 gap-2">${Array.from({length:7}, (_, i) => { const d = addDays(mon, i), its = dayItems(d), isT = d === today();
    return `<div data-drop="${d}" class="card p-2.5 min-h-[7rem] transition ${isT ? 'border-blue/60' : ''}"><div class="flex items-baseline justify-between mb-2"><span class="text-xs uppercase tracking-wider ${isT ? 'text-blue font-bold' : 'text-txt-3'}">${DAYS[i]}</span><span class="text-sm font-semibold">${D8(d).getDate()}</span></div>
      <div class="space-y-1.5">${its.length ? its.map(e => itemChip(e, false)).join('') : `<div class="text-xs text-txt-3">Repos</div>`}</div></div>`; }).join('')}</div>`;
}
function calMonthView(ref) {
  const first = ref.slice(0, 8) + '01', start = mondayOf(first), m = D8(first).getMonth();
  let cells = '';
  for (let i = 0; i < 42; i++) { const d = addDays(start, i), out = D8(d).getMonth() !== m, its = dayItems(d), isT = d === today();
    if (i === 35 && out) break;
    cells += `<div data-drop="${d}" class="min-h-[5.5rem] rounded-xl p-1.5 border transition ${isT ? 'border-blue/60 bg-blue/5' : 'border-ink-3 bg-ink-1'} ${out ? 'opacity-40' : ''}"><div class="text-xs ${isT ? 'text-blue font-bold' : 'text-txt-3'} mb-1">${D8(d).getDate()}</div><div class="space-y-1">${its.map(e => itemChip(e, true)).join('')}</div></div>`; }
  return `<div class="grid grid-cols-7 gap-1 text-center text-[11px] text-txt-3 mb-1">${DAYS_S.map(d => `<div>${d}</div>`).join('')}</div><div class="grid grid-cols-7 gap-1">${cells}</div>`;
}
function slotSheet(id) {
  const p = parseSlot(id), s = slot(p.w, p.key), conflicts = s.meta.calf ? calfEventsAround(s.date, s.id).filter(x => x.calf) : [];
  const sugg = suggestDates(s);
  return `<div class="space-y-3"><div><div class="text-xs text-txt-3">S${s.w} · Phase ${s.info.phase}${s.info.projected ? ' (prévisionnelle)' : ''}</div><h3 class="font-display text-2xl font-bold">${s.meta.icon} ${s.meta.name}</h3>
      <div class="mt-1 flex flex-wrap gap-1.5">${statusChip(s.status)}${s.postponed ? '<span class="chip bg-ink-3 text-txt-2">Reportée</span>' : ''}</div>
      <div class="text-sm text-txt-2 mt-2">${fmtLong(s.date)}${s.moved ? ` · prévue initialement le ${fmtS(s.planned)}` : ''}</div></div>
    ${conflicts.length ? `<div class="rounded-xl bg-warn/10 border border-warn/40 p-3 text-sm text-warn">⚠ Proche d’une autre séance exigeante pour les mollets : ${conflicts.map(c => `${c.label} (${fmtS(c.day)})`).join(', ')}.</div>` : ''}
    <div class="flex flex-wrap gap-2">${!s.log && s.status !== 'replaced' ? btn('Commencer', 'run-start', `data-v="${s.id}"`) : ''}${btn('Fiche de séance', 'open-slot', `data-v="${s.id}"`, 'ghost')}${s.log ? btn('Bilan enregistré', 'show-log', `data-v="${s.log.id}"`, 'ghost') : ''}</div>
    ${!s.log ? `<div class="rounded-xl bg-ink-2 p-3"><div class="lbl">Déplacer cette séance</div><div class="flex gap-2"><input type="date" id="mv-date" value="${s.date}" class="inp flex-1">${btn('Déplacer', 'slot-move', `data-v="${s.id}"`)}</div>
      <div class="flex flex-wrap gap-1.5 mt-2">${[[-1,'Veille'],[1,'Lendemain'],[2,'+2 jours']].map(([n,l]) => { const d = addDays(s.date, n); return `<button data-a="slot-move" data-v="${s.id}" data-d="${d}" class="chip bg-ink-3 text-txt-1 !py-1.5">${l} · ${fmtS(d)}</button>`; }).join('')}${s.date !== today() ? `<button data-a="slot-move" data-v="${s.id}" data-d="${today()}" class="chip bg-blue/15 text-blue !py-1.5">Aujourd’hui</button>` : ''}</div>
      ${sugg.length ? `<div class="mt-2 text-xs text-txt-3">Dates compatibles (pas d’autre séance « mollets » à ± 24 h) :</div><div class="flex flex-wrap gap-1.5 mt-1">${sugg.map(d => `<button data-a="slot-move" data-v="${s.id}" data-d="${d}" class="chip bg-good/15 text-good !py-1.5">${fmtD(d)}</button>`).join('')}</div>` : ''}
      ${s.moved ? `<button data-a="slot-unmove" data-v="${s.id}" class="text-xs text-blue underline mt-2">Revenir à la date prévue</button>` : ''}</div>` : ''}
    <div class="flex flex-wrap gap-2">${!s.log && s.status !== 'missed' ? btn('Marquer non effectuée', 'slot-missed', `data-v="${s.id}"`, 'ghost') : ''}${ST().slotStatus[s.id] === 'missed' ? btn('Annuler « non effectuée »', 'slot-clear', `data-v="${s.id}"`, 'ghost') : ''}
      ${s.status === 'replaced' ? btn('Garder cette séance', 'slot-keep', `data-v="${s.id}"`, 'ghost') : ''}${ST().slotStatus[s.id] === 'keep' ? btn('Laisser le collectif la remplacer', 'slot-clear', `data-v="${s.id}"`, 'ghost') : ''}</div></div>`;
}
function eventSheet(id) {
  const e = ST().events.find(x => x.id === id); if (!e) return '';
  const ic = { collectif:'🤾 Entraînement collectif', bilan:'🩺 Bilan fonctionnel', repos:'💤 Repos' }[e.type];
  return `<div class="space-y-3"><h3 class="font-display text-2xl font-bold">${ic}</h3>
    <label class="block"><span class="lbl">Date</span><input type="date" data-ev="date" data-v="${e.id}" value="${e.date}" class="inp w-full"></label>
    ${e.type === 'collectif' ? `<div class="grid grid-cols-2 gap-2"><label><span class="lbl">Durée (min)</span><input type="number" data-ev="duration" data-v="${e.id}" value="${e.duration ?? ''}" class="inp w-full"></label>
      <div><span class="lbl">Statut</span>${chips('ev:done:' + e.id, e.done ? 1 : 0, [[0,'Prévu'],[1,'Réalisé','good']], 'grid grid-cols-2')}</div></div>
      ${e.done ? `<div><span class="lbl">RPE de l’entraînement</span>${chips('ev:rpe:' + e.id, e.rpe, rpeOpts(), 'grid grid-cols-5')}${e.rpe && e.duration ? `<p class="text-xs text-txt-3 mt-1">Charge : ${e.duration * e.rpe} UA</p>` : ''}</div>` : ''}
      <p class="text-xs text-txt-3">Pense à la routine de prévention épaule avant l’entraînement.</p>` : ''}
    ${e.type === 'bilan' ? `<p class="text-sm text-txt-2">Les résultats se saisissent dans Programme → Phases & validation (jamais remplis automatiquement).</p>${btn('Saisir les résultats', 'goto-bilan', '', 'ghost')}` : ''}
    <label class="block"><span class="lbl">Notes</span><textarea data-ev="notes" data-v="${e.id}" rows="2" class="inp w-full">${esc(e.notes || '')}</textarea></label>
    <div class="flex justify-between">${btn('Supprimer', 'ev-del', `data-v="${e.id}"`, 'danger')}${btn('Fermer', 'sheet-close', '', 'ghost')}</div></div>`;
}
