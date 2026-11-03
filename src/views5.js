/* =====================================================================
   PARCOURS SIMPLIFIÉ : 1. Faire · 2. Renseigner · 3. Visualiser
   ===================================================================== */
const EST_MIN = { A:65, B:45, C:55, D:60 };

/* ---------- Ce qui attend une réponse ---------- */
function pendingItems() {
  const out = [], st = ST(), t = today(), cw = calWeek();
  if (DB().active) out.push({ type:'run', prio:0, title:'Séance en cours à terminer', sub: SESSIONS[parseSlot(DB().active.slot).key].name, icon:'▶' });
  if (!checkinFor(t)) {
    const rec = DB().logs.filter(l => [1,2].includes(diffDays(t, l.date))).map(l => `${SESSIONS[l.key].short} (${diffDays(t, l.date) === 1 ? '24 h' : '48 h'})`);
    out.push({ type:'ci', prio:1, title:'Suivi du matin', sub: rec.length ? `Sert aussi de contrôle après : ${rec.join(', ')}` : 'Mollets, épaule, récupération, montre · 1 min', icon:'☀' });
  }
  [cw-1, cw].filter(w => w >= 1).forEach(w => weekSlots(w).forEach(s => {
    if (s.status === 'missed' && st.slotStatus[s.id] !== 'missed' && diffDays(t, s.date) <= 10)
      out.push({ type:'slot', prio:2, id:s.id, title:`As-tu fait la séance ${s.key} ?`, sub:`${s.meta.name} · prévue ${fmtD(s.date)}`, icon:s.meta.icon });
  }));
  st.events.filter(e => e.type === 'collectif' && e.date <= t && !e.asked && (!e.done || !e.rpe)).forEach(e =>
    out.push({ type:'coll', prio:3, id:e.id, title:'Entraînement collectif', sub:`${fmtD(e.date)} · durée et effort à renseigner`, icon:'🤾' }));
  const props = allProposals().sort((a, b) => (a.action === 'down' ? 0 : 1) - (b.action === 'down' ? 0 : 1));
  if (props.length) out.push({ type:'props', prio:4, props, title: props.length === 1 ? 'Un ajustement de charge proposé' : `${props.length} ajustements de charge proposés`, sub:'Tu décides : accepter ou maintenir le palier', icon:'⇅' });
  const wi = weekInfo(cw), b = st.bilans[wi.phase];
  if (wi.bilan && !(b && b.date)) out.push({ type:'bilan', prio:5, title: wi.phase === 2 ? 'Évaluation avant reprise collective' : 'Bilan fonctionnel de fin de phase', sub:'À réaliser cette semaine, idéalement avec ton kiné', icon:'🩺' });
  return out.sort((a,b) => a.prio - b.prio);
}

/* ---------- 1. AUJOURD'HUI ---------- */
function todaySlot() {
  const cw = calWeek(), all = [cw-1, cw, cw+1].filter(w => w >= 1).flatMap(weekSlots);
  return all.find(s => s.date === today() && s.status !== 'replaced') || null;
}
function nextSlot() {
  const cw = calWeek();
  return [cw, cw+1, cw+2].flatMap(weekSlots).filter(s => s.date > today() && ['planned','today'].includes(s.status)).sort((a,b) => a.date.localeCompare(b.date))[0] || null;
}
function sessionHero(s, isToday) {
  const plan = slotPlan(s), vg = vigilanceToday(), flagged = plan.filter(p => p.ex.zone && ['orange','red'].includes(exVigilance(p.ex, vg).level));
  const running = DB().active && DB().active.slot === s.id;
  const open = ui.open['hero-list'];
  return `<section class="card p-5 lg:p-6 ${isToday ? 'border-blue/50' : ''}">
    <div class="text-xs uppercase tracking-widest ${isToday ? 'text-blue' : 'text-txt-3'} font-semibold">${isToday ? 'Séance du jour' : 'Prochaine séance · ' + fmtLong(s.date)}</div>
    <div class="flex items-center gap-3 mt-2"><span class="text-4xl">${s.meta.icon}</span><div><h2 class="font-display text-3xl font-bold leading-none">${s.meta.name}</h2>
      <div class="text-sm text-txt-3 mt-1">Séance ${s.key} · ${plan.length} exercices · ≈ ${EST_MIN[s.key]} min${s.info.deload ? ' · <span class="text-warn">allègement</span>' : ''}</div></div></div>
    ${vg.global === 'unknown' ? `<button data-a="wiz-ci" class="mt-4 w-full text-left rounded-xl bg-ink-2 p-3 text-sm flex items-center gap-3"><span class="text-xl">☀</span><span class="flex-1">Réponds d’abord au <b>suivi du matin</b> : il adapte la séance à tes sensations.</span><span class="text-blue">→</span></button>`
      : flagged.length ? `<div class="mt-4 rounded-xl ${vg.global === 'red' ? 'bg-bad/10 border-bad/40' : 'bg-warn/10 border-warn/40'} border p-3 text-sm">${vigChip(worst(flagged.map(p => exVigilance(p.ex, vg).level)))} <span class="ml-1">${flagged.length} exercice(s) à adapter ou arrêter aujourd’hui. Tu choisiras pendant la séance.</span></div>`
      : `<div class="mt-4 text-sm text-txt-2">${vigChip(vg.global)} <span class="ml-1">${VIG[vg.global].t}</span></div>`}
    <button data-a="toggle" data-v="hero-list" class="mt-4 text-sm text-txt-2 hover:text-txt-1">${open ? '▴ Masquer' : '▾ Voir'} le contenu</button>
    ${open ? `<ol class="mt-2 space-y-1.5 fade-in">${plan.map((p, i) => `<li class="flex gap-3 text-sm"><span class="text-txt-3 font-mono text-xs w-4 mt-0.5">${i+1}</span><div><div>${p.ex.n}</div><div class="text-xs text-blue">${p.text}</div></div></li>`).join('')}</ol>` : ''}
    <div class="mt-5 grid gap-2">
      ${running ? btn('▶ Reprendre la séance', 'run-open', 'style="min-height:56px;font-size:1.05rem"')
        : btn(isToday ? '▶ Commencer la séance' : '▶ La faire maintenant', isToday ? 'run-start' : 'run-now', `data-v="${s.id}" style="min-height:56px;font-size:1.05rem"`)}
      <div class="grid grid-cols-2 gap-2">${btn('✓ Déjà faite', 'quick-done', `data-v="${s.id}"`, 'ghost')}${btn('📅 Déplacer', 'sheet-slot', `data-v="${s.id}"`, 'ghost')}</div>
    </div></section>`;
}
function weekStrip() {
  const mon = mondayOf(today());
  return `<div class="grid grid-cols-7 gap-1.5">${Array.from({length:7}, (_, i) => { const d = addDays(mon, i), its = eventsOn(d).filter(e => e.type === 'session' || e.type === 'collectif'), isT = d === today();
    return `<div class="rounded-xl p-1.5 text-center ${isT ? 'bg-blue/15 border border-blue/50' : 'bg-ink-1 border border-ink-3'}"><div class="text-[10px] uppercase ${isT ? 'text-blue font-bold' : 'text-txt-3'}">${DAYS_S[i]}</div>
      <div class="mt-1 space-y-1 min-h-[1.75rem]">${its.map(e => e.type === 'session' ? `<button data-a="sheet-slot" data-v="${e.slot.id}" class="w-full rounded-md text-xs font-bold py-1 ${STATUS[e.slot.status].c}" title="${e.slot.meta.name} · ${STATUS[e.slot.status].l}">${e.slot.key}</button>` : `<button data-a="sheet-ev" data-v="${e.id}" class="w-full rounded-md text-xs py-1 bg-blue/15">🤾</button>`).join('') || '<div class="text-[10px] text-txt-3 pt-1">—</div>'}</div></div>`; }).join('')}</div>`;
}
function vToday() {
  const cw = calWeek(), wi = weekInfo(cw), ts = todaySlot(), pend = pendingItems(), st = ST();
  let main;
  if (ts && ts.log) main = card(`<div class="flex items-center gap-3"><span class="w-12 h-12 rounded-2xl bg-good text-ink-0 grid place-items-center text-2xl font-bold">✓</span><div><div class="text-xs uppercase tracking-widest text-good font-semibold">Séance du jour terminée</div>
      <div class="font-display text-2xl font-bold">${ts.meta.name}</div><div class="text-sm text-txt-3">${ts.log.durMin} min · RPE ${ts.log.rpe ?? '—'} · ${STATUS[ts.log.status].l}</div></div></div>
      <div class="flex flex-wrap gap-2 mt-4">${btn('Voir le bilan', 'show-log', `data-v="${ts.log.id}"`, 'ghost')}${btn('Mes données →', 'tab', 'data-v="data"', 'ghost')}</div>
      <p class="text-sm text-txt-2 mt-4">Demain matin, le suivi du jour servira de contrôle à 24 h.</p>`, 'border-good/40');
  else if (ts) main = sessionHero(ts, true);
  else { const nx = nextSlot();
    main = `${card(`<div class="flex items-center gap-3"><span class="text-3xl">💤</span><div><div class="font-display text-2xl font-bold">Pas de séance aujourd’hui</div><div class="text-sm text-txt-3">Récupération : marche, mobilité, sommeil.</div></div></div>`)}${nx ? sessionHero(nx, false) : ''}`; }
  const onb = !st.onboarded && !DEMO ? `<div class="rounded-2xl border border-good/40 bg-good/5 p-4 flex flex-wrap items-center justify-between gap-3"><div class="text-sm"><b>Ton programme de 16 semaines est prêt.</b> <span class="text-txt-2">Séances lun · mer · ven · dim. Vérifie la date de début et ta VMA si tu la connais.</span></div><div class="flex gap-2">${btn('Réglages', 'goto-set', 'data-v="calendrier"', 'ghost')}${btn('OK', 'onboard', '', 'good')}</div></div>` : '';
  const needSync = !GH.on() && !DEMO && !(window.claude && window.claude.use) && !ui.syncDismissed;
  const syncBanner = needSync ? `<div class="rounded-2xl border border-blue/40 bg-blue/5 p-4 flex flex-wrap items-center justify-between gap-3"><div class="text-sm"><b>Données enregistrées sur cet appareil uniquement.</b> <span class="text-txt-2">Active la synchronisation pour les retrouver sur ton téléphone et ton ordinateur.</span></div><div class="flex gap-2">${btn('Plus tard', 'sync-later', '', 'ghost')}${btn('Activer', 'goto-set', 'data-v="donnees"')}</div></div>` : '';
  return `${pageHead(fmtLong(today()).replace(/^./, c => c.toUpperCase()), `Semaine ${cw}${cw <= 16 ? '/16' : ''} · Phase ${wi.phase} · ${PHASES[wi.phase-1].short}`)}
  <main class="px-4 lg:px-8 space-y-4 max-w-2xl fade-in">${syncBanner}${onb}
    ${pend.length ? `<button data-a="tab" data-v="inbox" class="w-full rounded-2xl bg-ink-1 border border-warn/40 p-4 flex items-center gap-3 text-left hover:border-warn"><span class="w-9 h-9 rounded-full bg-warn text-ink-0 grid place-items-center font-bold">${pend.length}</span>
      <span class="flex-1"><b>${pend.length === 1 ? 'Une question' : pend.length + ' questions'} en attente</b><span class="block text-sm text-txt-3">${pend.slice(0, 2).map(p => p.title).join(' · ')}</span></span><span class="text-warn text-xl">→</span></button>` : ''}
    ${main}
    <section><div class="flex items-center justify-between mb-2"><h3 class="text-sm font-semibold text-txt-2">Ma semaine</h3><button data-a="tab" data-v="cal" class="text-xs text-blue">Calendrier →</button></div>${weekStrip()}</section>
  </main>`;
}

/* ---------- 2. QUESTIONS ---------- */
function vInbox() {
  const items = pendingItems();
  const row = it => {
    if (it.type === 'props') { const all = ui.open['props-all'], list = all ? it.props : it.props.slice(0, 2);
      return `<li class="card p-4"><div class="flex items-start gap-3"><span class="w-10 h-10 shrink-0 rounded-xl bg-ink-2 grid place-items-center text-xl">${it.icon}</span><div class="flex-1"><div class="font-semibold">${it.title}</div><div class="text-sm text-txt-3">${it.sub}</div></div></div>
        <ul class="space-y-2 mt-3">${list.map(proposalRow).join('')}</ul>${it.props.length > 2 ? `<button data-a="toggle" data-v="props-all" class="mt-2 text-sm text-blue">${all ? '▴ Réduire' : `▾ Voir les ${it.props.length - 2} autres`}</button>` : ''}</li>`; }
    let actions = '';
    if (it.type === 'run') actions = btn('Reprendre', 'run-open');
    if (it.type === 'ci') actions = btn('Répondre', 'wiz-ci');
    if (it.type === 'slot') actions = `${btn('Oui, comme prévu', 'quick-done', `data-v="${it.id}"`, 'good')}${btn('Oui, en partie', 'run-start', `data-v="${it.id}"`, 'ghost')}${btn('Non', 'slot-missed', `data-v="${it.id}"`, 'ghost')}${btn('Je la reporte', 'sheet-slot', `data-v="${it.id}"`, 'ghost')}`;
    if (it.type === 'coll') actions = `${btn('Renseigner', 'sheet-ev', `data-v="${it.id}"`)}${btn('Pas fait', 'coll-skip', `data-v="${it.id}"`, 'ghost')}`;
    if (it.type === 'bilan') actions = btn('Ouvrir le bilan', 'goto-bilan', '', 'ghost');
    return `<li class="card p-4"><div class="flex items-start gap-3"><span class="w-10 h-10 shrink-0 rounded-xl bg-ink-2 grid place-items-center text-xl">${it.icon}</span><div class="flex-1 min-w-0"><div class="font-semibold">${it.title}</div><div class="text-sm text-txt-3">${it.sub}</div></div></div>
      <div class="flex flex-wrap gap-2 mt-3">${actions}</div></li>`;
  };
  return `${pageHead('Questions', 'Tout ce qui attend ta réponse, du plus urgent au moins urgent.')}
  <main class="px-4 lg:px-8 max-w-2xl fade-in">${items.length ? `<ul class="space-y-3">${items.map(row).join('')}</ul>`
    : `<div class="card p-8 text-center"><div class="text-4xl">✓</div><div class="font-display text-2xl font-bold mt-2">Tout est à jour</div><p class="text-sm text-txt-3 mt-1">Reviens demain matin pour le suivi du jour.</p>${checkinFor(today()) ? `<div class="mt-4">${btn('Modifier le suivi du jour', 'wiz-ci', '', 'ghost')}</div>` : ''}</div>`}</main>`;
}

/* ---------- Assistants pas à pas ---------- */
function painGrid(group, value, invert = false) {
  return `<div class="grid grid-cols-6 gap-1.5" role="radiogroup">${Array.from({length:11}, (_, v) => {
    const x = invert ? 10 - v : v, tone = x <= 2 ? 'bg-good text-ink-0 border-good' : x <= 4 ? 'bg-warn text-ink-0 border-warn' : 'bg-bad text-ink-0 border-bad', sel = value === v;
    return `<button type="button" role="radio" aria-checked="${sel}" data-a="pick" data-g="${group}" data-v="${v}" class="h-12 rounded-xl border text-base font-bold ${sel ? tone : 'border-ink-3 bg-ink-2 text-txt-2'}">${v}</button>`; }).join('')}</div>`;
}
const Q = (label, hint, inner) => `<div><div class="font-semibold">${label}</div>${hint ? `<div class="text-xs text-txt-3 mb-2">${hint}</div>` : '<div class="mb-2"></div>'}${inner}</div>`;
function wizardShell(title, step, total, body, canNext, nextLabel, a) {
  return `<div class="fixed inset-0 z-50 bg-ink-0 overflow-y-auto fade-in" id="wizard"><div class="max-w-xl mx-auto px-4 pt-4 pb-32 safe-t">
    <div class="flex items-center gap-3"><button data-a="wiz-close" class="w-11 h-11 rounded-xl bg-ink-2" aria-label="Fermer">✕</button><div class="flex-1"><div class="text-xs text-txt-3">${title} · ${step+1}/${total}</div>
      <div class="flex gap-1 mt-1.5">${Array.from({length: total}, (_, i) => `<span class="h-1.5 flex-1 rounded-full ${i <= step ? 'bg-blue' : 'bg-ink-3'}"></span>`).join('')}</div></div></div>
    <div class="mt-6 space-y-6">${body}</div></div>
    <footer class="fixed bottom-0 inset-x-0 bg-ink-1/95 backdrop-blur border-t border-ink-3 safe-b"><div class="max-w-xl mx-auto px-4 py-3 flex gap-2">
      ${step > 0 ? btn('← Retour', 'wiz-prev', '', 'ghost') : ''}<div class="flex-1"></div>${btn(nextLabel, a || 'wiz-next', canNext ? 'style="min-width:9rem"' : 'disabled style="min-width:9rem"', a ? 'good' : 'primary')}</div></footer></div>`;
}
function wizCheckin() {
  const date = today(); if (!ui.ci || ui.ciFor !== date) { ui.ci = clone(checkinFor(date) || emptyCi()); ui.ciFor = date; }
  const c = ui.ci, s = ui.wiz.step, prev = checkinFor(addDays(date, -1));
  const calfStep = (z, name, note) => `<h2 class="font-display text-3xl font-bold">${name}</h2><p class="text-sm text-txt-3 -mt-4">${note}</p>
    ${z === 'calfL' && prev && !checkinFor(date) ? `<button data-a="ci-copy-wiz" class="w-full rounded-xl border border-ink-3 p-3 text-sm text-left">↺ Comme hier pour tout le suivi (tu pourras ajuster)</button>` : ''}
    ${Q('Douleur ce matin', '0 = aucune · 10 = maximale', painGrid(`wci:${z}.pain`, c[z].pain))}
    ${Q('Raideur au réveil', '0 = aucune · 10 = très raide', painGrid(`wci:${z}.stiff`, c[z].stiff))}
    <details ${ui.open['det-'+z] ? 'open' : ''}><summary data-a="toggle" data-v="det-${z}" class="text-sm text-blue">+ Détails (sensation, tolérances) — optionnel</summary><div class="space-y-4 mt-3">
      ${Q('Sensation musculaire', '', chips(`ci:${z}.sens`, c[z].sens, SENS, 'grid grid-cols-2'))}
      ${[['tolRun','Tolérance à la course'],['tolJump','Tolérance aux sauts'],['tolStr','Tolérance au renforcement']].map(([k,l]) => Q(l, '', chips(`ci:${z}.${k}`, c[z][k], TOL, 'grid grid-cols-4'))).join('')}</div></details>`;
  const steps = [
    { body: calfStep('calfL', 'Mollet gauche', 'Déchirure fin janvier · presque récupéré'), ok: c.calfL.pain != null && c.calfL.stiff != null },
    { body: calfStep('calfR', 'Mollet droit', 'Déchirure il y a ~11 mois'), ok: c.calfR.pain != null && c.calfR.stiff != null },
    { body: `<h2 class="font-display text-3xl font-bold">Épaule droite</h2>${Q('Douleur', '0 = aucune · 10 = maximale', painGrid('wci:shoulder.pain', c.shoulder.pain))}
      ${Q('Sensation de stabilité', '0 = instable · 10 = très stable', painGrid('wci:shoulder.stab', c.shoulder.stab, true))}
      ${Q('Exercices préventifs faits hier ?', '', chips('ci:shoulder.prev', c.shoulder.prev, [['oui','Oui','good'],['non','Non']], 'grid grid-cols-2'))}`, ok: c.shoulder.pain != null && c.shoulder.stab != null },
    { body: `<h2 class="font-display text-3xl font-bold">Récupération</h2>${Q('Qualité du sommeil', '0 = très mauvaise · 10 = excellente', painGrid('wci:gen.sleep', c.gen.sleep, true))}
      ${Q('Fatigue générale', '0 = en forme · 10 = épuisé', painGrid('wci:gen.fatigue', c.gen.fatigue))}
      ${Q('Motivation', '0 = aucune · 10 = maximale', painGrid('wci:gen.motiv', c.gen.motiv, true))}`, ok: c.gen.sleep != null && c.gen.fatigue != null },
    { body: `<h2 class="font-display text-3xl font-bold">⌚ Ta montre</h2><p class="text-sm text-txt-3 -mt-4">Garmin Connect → valeurs de la nuit. Optionnel : passe si tu ne les as pas.</p>
      <div class="grid grid-cols-2 gap-3">${[['rhr','FC au repos','bpm'],['hrv','VFC nuit','ms'],['sleepH','Durée de sommeil','h'],['sleepScore','Score sommeil','/100'],['bb','Body Battery','/100']].map(([k,l,u]) =>
        `<label><span class="lbl">${l} (${u})</span><input type="number" inputmode="decimal" step="any" data-ci="gen.${k}" value="${c.gen[k] ?? ''}" class="inp w-full !text-lg !h-14"></label>`).join('')}</div>`, ok: true }
  ];
  if (s >= steps.length) {
    const tmp = { ...c, _date: date }, pv = checkinFor(addDays(date, -1));
    const z = { calfL: zoneVigilance('calfL', tmp, pv), calfR: zoneVigilance('calfR', tmp, pv), shoulder: zoneVigilance('shoulder', tmp, pv), gen: zoneVigilance('gen', tmp, pv) };
    const g = worst(Object.values(z).map(x => x.level));
    return wizardShell('Suivi du matin', s, steps.length + 1, `<h2 class="font-display text-3xl font-bold">Résultat</h2>
      <div class="card p-4 ${g === 'red' ? 'border-bad/50' : g === 'orange' ? 'border-warn/50' : 'border-good/40'}">${vigChip(g)}<p class="mt-2">${VIG[g].t}</p>
      ${Object.entries({calfL:'Mollet G', calfR:'Mollet D', shoulder:'Épaule', gen:'Récupération'}).filter(([k]) => z[k].reasons.length).map(([k, l]) => `<div class="text-sm text-txt-2 mt-1">• ${l} : ${z[k].reasons.join(', ')}</div>`).join('')}</div>
      ${g === 'red' ? '<p class="text-sm text-bad">Les exercices de la zone concernée seront à l’arrêt aujourd’hui. Si la douleur persiste ou s’aggrave, demande un avis médical.</p>' : g === 'orange' ? '<p class="text-sm text-txt-2">Rien n’est modifié automatiquement : pendant la séance, tu choisiras d’adapter ou non chaque exercice concerné.</p>' : '<p class="text-sm text-txt-2">Les critères d’arrêt de chaque exercice restent valables pendant la séance.</p>'}`, true, 'Enregistrer ✓', 'wiz-ci-save');
  }
  return wizardShell('Suivi du matin', s, steps.length + 1, steps[s].body, steps[s].ok, s === 4 ? 'Voir le résultat →' : 'Suivant →');
}
function wizBilan() {
  const a = DB().active, b = a.bilan, s = ui.wiz.step, p = parseSlot(a.slot);
  const quick = !!a.quick, sm = runSummary(a);
  const dur = b.durMin ?? (quick ? EST_MIN[p.key] : Math.max(1, Math.round(runElapsed(a) / 60000)));
  const steps = [];
  if (quick) steps.push({ body: `<h2 class="font-display text-3xl font-bold">Comment se sont passés les exercices ?</h2><p class="text-sm text-txt-3 -mt-4">${SESSIONS[p.key].name} · ${fmtLong(a.date)}</p>
      <div class="grid gap-2">${[['1','✓ Tout comme prévu, technique propre','Séries, répétitions et charges prévues réalisées'],['2','≈ Fait, mais plus dur que prévu','Technique correcte, effort élevé'],['3','✕ Pas tout fait / douleur','Tu pourras détailler exercice par exercice']].map(([v,l,h]) =>
        `<button data-a="pick" data-g="bilq" data-v="${v}" class="text-left rounded-2xl border p-4 ${String(b.quality) === v ? 'border-blue bg-blue/10' : 'border-ink-3 bg-ink-2'}"><div class="font-semibold">${l}</div><div class="text-sm text-txt-3">${h}</div></button>`).join('')}</div>`, ok: b.quality != null });
  steps.push({ body: `<h2 class="font-display text-3xl font-bold">Effort global de la séance</h2>${Q('RPE', '1 = très facile · 5 = moyen · 8 = très dur · 10 = maximal', chips('bil:rpe', b.rpe, rpeOpts(), 'grid grid-cols-5'))}
      <label class="block"><span class="font-semibold">Durée</span><div class="flex items-center gap-2 mt-2"><input type="number" data-bil="durMin" value="${dur}" class="inp w-28 !text-2xl !h-14 text-center"><span class="text-txt-3">minutes</span></div></label>
      ${b.rpe ? `<p class="text-sm text-txt-2">Charge de séance : ${dur} × ${b.rpe} = <b class="text-txt-1">${dur * b.rpe} UA</b></p>` : ''}`, ok: b.rpe != null });
  steps.push({ body: `<h2 class="font-display text-3xl font-bold">Sensations à froid</h2>${Q('Muscles', '', chips('bil:sens', b.sens, [['fraiches','Fraîches','good'],['normales','Normales','good'],['lourdes','Lourdes','warn'],['courbatures','Courbatures','warn'],['tensions','Tensions localisées','bad']], 'grid grid-cols-2'))}
      ${Object.entries(ZONES).map(([z, l]) => Q(`Douleur · ${l}`, '0 = aucune · 10 = maximale', painGrid('wbil:' + z, b.pains[z]))).join('')}`, ok: b.sens != null && Object.keys(ZONES).every(z => b.pains[z] != null) });
  steps.push({ body: `<h2 class="font-display text-3xl font-bold">Récapitulatif</h2>
      <div class="grid grid-cols-3 gap-2">${[['Durée', dur + ' min'],['RPE', b.rpe],['Charge', dur * (b.rpe||0) + ' UA']].map(([k,v]) => `<div class="card p-3"><div class="text-xs text-txt-3">${k}</div><div class="font-display text-2xl font-bold">${v}</div></div>`).join('')}</div>
      <div class="card p-3 text-sm">${quick ? (b.quality === 3 ? 'Exercices : à détailler' : 'Exercices réalisés comme prévu') : `${sm.full}/${a.items.length} exercices complets · ${sm.tonnage} kg soulevés`} · statut : ${(quick ? b.quality !== 3 : sm.complete) ? '<b class="text-good">terminée</b>' : '<b class="text-warn">incomplète</b>'}</div>
      <label class="block"><span class="font-semibold">Un commentaire ?</span><textarea data-bil="comment" rows="3" class="inp w-full mt-2" placeholder="Optionnel">${esc(b.comment)}</textarea></label>`, ok: true });
  const last = s === steps.length - 1;
  if (quick && s === 0 && b.quality === 3) return wizardShell('Bilan de séance', s, steps.length, steps[0].body + `<div class="card p-4 text-sm">Ouvre la séance pour cocher ce qui a été fait et signaler une douleur.</div>`, true, 'Détailler la séance →', 'bil-detail');
  return wizardShell('Bilan de séance', s, steps.length, steps[s].body, steps[s].ok, last ? 'Enregistrer ✓' : 'Suivant →', last ? 'bil-save' : null);
}
function startQuickDone(sid) {
  const p = parseSlot(sid), s = slot(p.w, p.key);
  startRun(sid); const a = DB().active; a.quick = true; a.date = s.date <= today() ? s.date : today();
  a.items.forEach(it => it.sets.forEach(x => x.done = true));
  a.bilan.durMin = EST_MIN[p.key];
  ui.runOpen = false; ui.wiz = { type:'bilan', step:0 }; persist('active');
}

/* ---------- 3. MES DONNÉES ---------- */
function vData() {
  const cw = calWeek(), ws = weekStats(cw), wp = cw > 1 ? weekStats(cw-1) : null, pr = programProgress();
  const done = DB().logs.filter(l => l.status === 'done').length;
  const days14 = Array.from({length:14}, (_, i) => addDays(today(), i-13));
  const painAvg = round1(avg(days14.slice(7).map(d => checkinFor(d)).filter(Boolean).map(c => Math.max(c.calfL.pain||0, c.calfR.pain||0))));
  const delta = (a, b) => b == null || a == null ? '' : `<span class="text-xs ${a >= b ? 'text-txt-2' : 'text-txt-2'}">${a - b >= 0 ? '+' : ''}${round1(a - b)} vs sem. préc.</span>`;
  const tile = (v, l, sub) => `<div class="card p-4"><div class="font-display text-3xl font-bold">${v}</div><div class="text-sm">${l}</div><div class="text-xs text-txt-3 mt-0.5">${sub || ''}</div></div>`;
  const tab = ui.dataTab || 'force', E = t => emptyState('Pas encore de données', t);
  let chart = '';
  if (tab === 'force') { const ids = ['squat','calf_straight','calf_bent'], pts = ids.map(id => exHistory(id).map(h => ({ d:h.log.date, v: Math.max(0, ...(h.e.sets||[]).filter(s => s.done).map(s => +s.load||0)) })).filter(p => p.v));
    const dates = [...new Set(pts.flat().map(p => p.d))].sort();
    chart = dates.length ? chartBox('dt-f', { type:'line', connect:true, labels: dates.map(fmtS), unit:'kg', series: ids.map((id, i) => ({ name: EX[id].n.split('(')[0].trim(), color:SERIES[i], values: dates.map(d => (pts[i].find(p => p.d === d) || {}).v ?? null) })) }, 220) : E('Termine une séance A pour suivre tes charges.'); }
  if (tab === 'course') { const w = Array.from({length: Math.min(cw, 16)}, (_, i) => weekStats(i+1));
    chart = w.some(x => x.km) ? chartBox('dt-c', { type:'bar', labels: w.map(x => 'S'+x.w), unit:'km', series:[{ name:'km', color:SERIES[0], values: w.map(x => x.km) }] }, 220) : E('Les km saisis dans les séances B et D apparaîtront ici.'); }
  if (tab === 'recup') { const d30 = Array.from({length:30}, (_, i) => addDays(today(), i-29));
    chart = d30.some(d => checkinFor(d)) ? chartBox('dt-r', { type:'line', labels: d30.map(fmtS), min:0, max:10, int:true, zone: TH().calfPain.o - 1, unit:'/10', series:[
      { name:'Mollet G', color:SERIES[0], values: d30.map(d => ((checkinFor(d)||{}).calfL||{}).pain ?? null) }, { name:'Mollet D', color:SERIES[1], values: d30.map(d => ((checkinFor(d)||{}).calfR||{}).pain ?? null) }, { name:'Épaule', color:SERIES[2], values: d30.map(d => ((checkinFor(d)||{}).shoulder||{}).pain ?? null) }] }, 220) : E('Le suivi du matin alimente ce graphique.'); }
  if (tab === 'charge') { const w = Array.from({length: Math.min(cw, 16)}, (_, i) => weekStats(i+1));
    chart = w.some(x => x.load) ? chartBox('dt-l', { type:'bar', stacked:true, labels: w.map(x => 'S'+x.w), unit:'UA', series:[{ name:'Perso', color:SERIES[0], values: w.map(x => x.persoLoad) }, { name:'Collectif', color:SERIES[2], values: w.map(x => x.collLoad) }] }, 220) + '<p class="text-xs text-txt-3 mt-2">Charge = durée × RPE. Évite les hausses brutales d’une semaine à l’autre.</p>' : E('Renseigne le RPE à la fin de tes séances.'); }
  const last = [...DB().logs].sort((a,b) => (b.end||0) - (a.end||0)).slice(0, 5);
  return `${pageHead('Mes données', 'L’essentiel en un coup d’œil.', btn('Analyse complète →', 'tab', 'data-v="stats"', 'ghost'))}
  <main class="px-4 lg:px-8 space-y-4 max-w-3xl fade-in">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      ${tile(`${done}<span class="text-txt-3 text-xl">/64</span>`, 'Séances terminées', `programme ${pr.pct} %`)}
      ${tile(ws.load + '<span class="text-txt-3 text-base"> UA</span>', 'Charge cette semaine', delta(ws.load, wp && wp.load))}
      ${tile(ws.km + '<span class="text-txt-3 text-base"> km</span>', 'Course cette semaine', delta(ws.km, wp && wp.km))}
      ${tile(painAvg ?? '—', 'Douleur mollets', 'moyenne 7 derniers jours (/10)')}
    </div>
    ${card(`<div class="scroll-x flex gap-1.5 mb-4">${[['force','Charges'],['course','Course'],['recup','Douleurs'],['charge','Charge hebdo']].map(([k,l]) => `<button data-a="data-tab" data-v="${k}" class="shrink-0 min-h-[40px] px-4 rounded-xl text-sm font-medium ${tab===k ? 'bg-blue text-white' : 'bg-ink-2 text-txt-2'}">${l}</button>`).join('')}</div>${chart}`)}
    ${card(`${h2('Dernières séances')}${last.length ? `<ul class="divide-y divide-ink-3">${last.map(l => `<li><button data-a="show-log" data-v="${l.id}" class="w-full text-left py-3 flex items-center gap-3"><span class="text-xl">${SESSIONS[l.key].icon}</span><div class="flex-1 min-w-0"><div class="font-medium text-sm">${SESSIONS[l.key].name}</div><div class="text-xs text-txt-3">${fmtD(l.date)} · ${l.durMin} min · RPE ${l.rpe ?? '—'}</div></div>${statusChip(l.status)}</button></li>`).join('')}</ul>` : '<p class="text-sm text-txt-3">Aucune séance enregistrée.</p>'}`)}
  </main>`;
}
