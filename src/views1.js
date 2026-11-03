/* =====================================================================
   DASHBOARD
   ===================================================================== */
function vDash() {
  const st = ST(), cw = calWeek(), wi = weekInfo(cw), ph = PHASES[wi.phase-1];
  const vg = vigilanceToday(), pr = programProgress(), props = allProposals();
  const slots = weekSlots(cw);
  const next = [cw, cw+1].flatMap(w => weekSlots(w)).filter(s => ['planned','today'].includes(s.status) && s.date >= today()).sort((a,b) => a.date.localeCompare(b.date))[0];
  const allDone = DB().logs.filter(l => l.status === 'done').length, inc = DB().logs.filter(l => l.status === 'incomplete').length;
  const collW = st.settings.collective.week, toColl = collW - cw;
  const ws = Array.from({length: Math.min(cw, 16)}, (_, i) => weekStats(i+1));
  const lastLogs = [...DB().logs].sort((a,b) => (b.end||0) - (a.end||0)).slice(0, 3);
  const pain14 = Array.from({length:14}, (_, i) => addDays(today(), i-13));

  // Timeline 16 semaines
  let tl = `<div class="flex gap-1 mt-3">`;
  for (let w = 1; w <= 16; w++) {
    const p = weekInfo(w).phase, past = w < cw, cur = w === cw;
    const col = ['#3d8bfd','#7c6cf0','#34c77b','#f2b84b'][p-1];
    tl += `<div class="flex-1 relative" title="S${w} · Phase ${p}${weekInfo(w).projected ? ' (projetée)' : ''}">
      <div class="h-2.5 rounded-full ${cur ? 'ring-2 ring-txt-1 ring-offset-2 ring-offset-ink-1' : ''}" style="background:${col};opacity:${past || cur ? 1 : .3}"></div>
      ${w === collW ? `<div class="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px]" title="Objectif reprise collective">🤾</div>` : ''}</div>`;
  }
  tl += `</div><div class="grid grid-cols-4 gap-1 mt-1.5 text-[10px] uppercase tracking-wider text-txt-3">${PHASES.map(p => `<div class="truncate ${p.n===wi.phase ? 'text-txt-1 font-semibold' : ''}">P${p.n}<span class="hidden sm:inline"> · ${p.short}</span></div>`).join('')}</div>`;

  const resume = DB().active ? `<div class="card p-4 border-blue/60 flex flex-wrap items-center justify-between gap-3 fade-in">
      <div><div class="text-xs uppercase tracking-widest text-blue font-semibold">Séance en cours</div><div class="font-semibold">${SESSIONS[parseSlot(DB().active.slot).key].name} · commencée ${new Date(DB().active.startedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div></div>
      ${btn('Reprendre la séance', 'run-open')}</div>` : '';

  const onboarding = !st.onboarded && !DEMO ? card(`<div class="flex flex-wrap gap-4 items-start justify-between"><div class="max-w-xl">
      <div class="text-xs uppercase tracking-widest text-good font-semibold">Bienvenue</div>
      <h2 class="font-display text-2xl font-bold mt-1">Ton programme de 16 semaines est préchargé</h2>
      <p class="text-sm text-txt-2 mt-1">Vérifie 3 réglages et commence par la semaine 1 : la date de début (lundi de la S1), tes jours d’entraînement et, si tu la connais, ta VMA (pour calculer tes distances de fractionné).</p></div>
      <div class="flex flex-wrap gap-2">${btn('Régler', 'goto-set', 'data-v="calendrier"', 'ghost')}${btn('C’est parti', 'onboard')}</div></div>
      <p class="text-xs text-txt-3 mt-3">Pour découvrir l’app avec des données fictives : Paramètres → Données → Mode démo (tes vraies données ne sont jamais mélangées).</p>`, 'border-good/40') : '';

  const vigCard = card(`${h2('État de vigilance', vigChip(vg.global))}
    ${vg.global === 'unknown' ? `<p class="text-sm text-txt-2">Aucun suivi aujourd’hui. Renseigne tes sensations : c’est ce qui permet d’adapter la séance et de valider les progressions.</p><div class="mt-3">${btn('Faire mon suivi du jour (1 min)', 'tab', 'data-v="care"')}</div>`
    : `<p class="text-sm text-txt-2 mb-3">${VIG[vg.global].t}${vg.stale ? ` · <span class="text-warn">suivi d’hier, pense à celui du jour</span>` : ''}</p>
      <div class="grid grid-cols-2 gap-2">${[['calfL','Mollet G'],['calfR','Mollet D'],['shoulder','Épaule D'],['gen','Général']].map(([z,l]) => {
        const v = vg.zones[z]; return `<div class="rounded-xl bg-ink-2 p-2.5"><div class="flex items-center justify-between text-sm"><span>${l}</span>${vigChip(v.level)}</div>${v.reasons.length ? `<div class="text-[11px] text-txt-3 mt-1">${v.reasons.join(' · ')}</div>` : ''}</div>`; }).join('')}</div>
      ${vg.global === 'green' ? `<p class="text-[11px] text-txt-3 mt-3">« Vert » signifie compatible avec le programme prévu, pas une autorisation à ignorer une douleur : les critères d’arrêt de chaque exercice restent valables.</p>` : ''}`}`);

  return `${pageHead(`Semaine ${cw}${cw > 16 ? ' (prolongation)' : ' <span class="text-txt-3 font-medium">/ 16</span>'}`, `${fmtLong(today())} · Phase ${wi.phase} validée en cours : ${ph.name}${wi.extended ? ' · <span class="text-warn">phase prolongée (non validée)</span>' : ''}`)}
  <main class="px-4 lg:px-8 space-y-4 max-w-7xl fade-in">
    ${resume}${onboarding}
    <div class="grid lg:grid-cols-3 gap-4">
      ${card(`<div class="flex items-start gap-4"><div class="shrink-0">${progressRing(pr.pct)}</div><div class="min-w-0">
        <div class="text-xs uppercase tracking-widest text-txt-3">Progression du programme</div>
        <div class="text-sm text-txt-2 mt-1">${allDone} séance(s) terminée(s)${inc ? ` · ${inc} incomplète(s)` : ''} · ${Math.max(0, 64 - allDone)} restantes<br>${pr.cOk}/${pr.cTotal} critères de phase validés</div>
        <p class="text-[11px] text-txt-3 mt-2">Calculée sur les séances et critères réellement validés. Ce n’est pas une aptitude médicale à reprendre.</p></div></div>
        <div class="mt-5 pt-3 border-t border-ink-3">${tl}</div>
        <div class="mt-4 flex items-center justify-between rounded-xl bg-ink-2 px-3 py-2.5"><span class="text-sm">🤾 Objectif reprise collective (S${collW})</span>
          <b class="text-sm ${toColl <= 0 ? 'text-good' : ''}">${toColl > 0 ? `dans ${toColl} sem.` : wi.phase >= 3 ? 'en cours' : 'phase 2 à valider'}</b></div>`, 'lg:col-span-2')}
      ${vigCard}
    </div>
    <div class="grid lg:grid-cols-3 gap-4">
      ${card(`${h2('Prochaine séance')}${next ? `<div class="flex items-center gap-3"><span class="text-3xl">${next.meta.icon}</span><div><div class="font-semibold">${next.meta.name}</div>
        <div class="text-sm text-txt-3">${fmtD(next.date)} · S${next.w} · ${slotPlan(next).length} exercices</div></div></div>
        <div class="flex gap-2 mt-4">${btn('Commencer', 'run-start', `data-v="${next.id}"`)}${btn('Fiche', 'open-slot', `data-v="${next.id}"`, 'ghost')}${btn('📅 Déplacer', 'sheet-slot', `data-v="${next.id}"`, 'ghost')}</div>`
        : `<p class="text-sm text-txt-2">Rien de prévu prochainement.</p>`}
        <div class="mt-4 pt-3 border-t border-ink-3"><div class="text-xs text-txt-3 mb-2">Cette semaine</div><div class="grid grid-cols-4 gap-1.5">${slots.map(s => `<button data-a="open-slot" data-v="${s.id}" class="rounded-xl bg-ink-2 p-2 text-center hover:bg-ink-3" title="${s.meta.name} · ${STATUS[s.status].l}"><div class="font-display text-lg font-bold">${s.key}</div><div class="text-[11px] ${STATUS[s.status].c} rounded-full px-1 mt-0.5 truncate">${STATUS[s.status].i}</div></button>`).join('')}</div></div>`)}
      ${card(`${h2('Ajustements proposés', props.length ? `<span class="chip bg-blue/15 text-blue">${props.length}</span>` : '')}
        ${props.length ? `<ul class="space-y-2">${props.slice(0, 3).map(p => proposalRow(p)).join('')}</ul>${props.length > 3 ? `<button data-a="tab" data-v="sess" class="text-sm text-blue mt-2">Voir les ${props.length} propositions →</button>` : ''}`
        : `<p class="text-sm text-txt-2">Aucune proposition en attente. Elles apparaissent quand un exercice a été validé plusieurs séances d’affilée (ou présente des signaux d’alerte), sensations à 24 h et 48 h comprises.</p>`}`)}
      ${card(`${h2('Dernières performances')}${lastLogs.length ? `<ul class="space-y-2.5">${lastLogs.map(l => {
          const best = Object.entries(l.ex || {}).filter(([id, x]) => EX[id] && EX[id].kind === 'strength' && !EX[id].repsProg && (x.sets||[]).some(s => s.done)).slice(0, 2)
            .map(([id, x]) => `${EX[id].n.split('(')[0].trim()} ${Math.max(...x.sets.filter(s=>s.done).map(s => +s.load))} kg`).join(' · ');
          return `<li class="text-sm"><div class="flex justify-between gap-2"><span class="font-medium">${SESSIONS[l.key].icon} ${SESSIONS[l.key].name}</span>${statusChip(l.status)}</div>
            <div class="text-xs text-txt-3">${fmtD(l.date)} · ${l.durMin} min · RPE ${l.rpe ?? '—'} · charge ${logLoad(l)} UA${best ? ' · ' + best : ''}</div></li>`; }).join('')}</ul>`
        : `<p class="text-sm text-txt-2">Tes séances enregistrées apparaîtront ici.</p>`}`)}
    </div>
    <div class="grid lg:grid-cols-3 gap-4">
      ${card(`${h2('Évolution des charges')}${miniLoadChart()}`)}
      ${card(`${h2('Cardio : volume de course', `<span class="text-xs text-txt-3">km / semaine</span>`)}${ws.some(x => x.km) ? chartBox('d-km', { type:'bar', labels: ws.map(x => 'S'+x.w), series:[{ name:'km', color:SERIES[0], values: ws.map(x => x.km) }], unit:'km' }, 150) : emptyState('Pas encore de course', 'Les km saisis dans les séances de fractionné s’afficheront ici.')}`)}
      ${card(`${h2('Douleurs · 14 jours', `<button data-a="tab" data-v="care" class="text-xs text-blue">Suivi →</button>`)}${pain14.some(d => checkinFor(d)) ? chartBox('d-pain', { type:'line', labels: pain14.map(d => fmtS(d)), min:0, max:10, int:true, zone: TH().calfPain.o - 1, series:[
          { name:'Mollet G', color:SERIES[0], values: pain14.map(d => (checkinFor(d)||{}).calfL ? checkinFor(d).calfL.pain : null) },
          { name:'Mollet D', color:SERIES[1], values: pain14.map(d => (checkinFor(d)||{}).calfR ? checkinFor(d).calfR.pain : null) },
          { name:'Épaule', color:SERIES[2], values: pain14.map(d => (checkinFor(d)||{}).shoulder ? checkinFor(d).shoulder.pain : null) }], unit:'/10' }, 150) : emptyState('Pas encore de suivi', 'Remplis le suivi quotidien pour voir l’historique.')}`)}
    </div>
  </main>`;
}
function miniLoadChart() {
  const ids = ['squat','calf_straight'], pts = ids.map(id => exHistory(id).map(h => ({ d:h.log.date, v: Math.max(0, ...(h.e.sets||[]).filter(s => s.done).map(s => +s.load||0)) })).filter(p => p.v));
  if (!pts.some(p => p.length)) return emptyState('Pas encore de charges', 'Enregistre une séance de force pour suivre squat et mollets.');
  const dates = [...new Set(pts.flat().map(p => p.d))].sort();
  return chartBox('d-load', { type:'line', labels: dates.map(fmtS), unit:'kg', series: ids.map((id, i) => ({ name: EX[id].n.split('(')[0].trim(), color:SERIES[i], values: dates.map(d => (pts[i].find(p => p.d === d) || {}).v ?? null) })) }, 150);
}
function proposalRow(p) {
  const ex = EX[p.id], up = p.action === 'up';
  return `<li class="rounded-xl bg-ink-2 p-3"><div class="flex items-start gap-2"><span class="${up ? 'text-good' : 'text-warn'} text-lg leading-none mt-0.5" aria-hidden="true">${up ? '▲' : '▼'}</span>
    <div class="flex-1 min-w-0"><div class="text-sm font-medium">${ex.n}</div>
    <div class="text-xs text-txt-2">${up ? 'Proposer une progression' : 'Revenir au palier précédent / réévaluer'} : ${fmtValue(p.id, p.cur)} → <b class="text-txt-1">${fmtValue(p.id, p.next)}</b></div>
    <ul class="text-[11px] text-txt-3 mt-1 list-disc pl-4">${p.why.map(w => `<li>${w}</li>`).join('')}</ul></div></div>
    <div class="flex gap-2 mt-2.5">${btn(up ? 'Accepter' : 'Appliquer', 'prop-yes', `data-v="${p.key}"`, up ? 'good' : 'warn')}${btn(up ? 'Refuser (maintenir)' : 'Maintenir', 'prop-no', `data-v="${p.key}"`, 'ghost')}</div></li>`;
}

/* =====================================================================
   SÉANCES : semaine en cours + fiches détaillées
   ===================================================================== */
function vSessions() {
  const cw = calWeek(); const w = ui.sessWeek || cw;
  const slots = weekSlots(w);
  if (!ui.sess || !parseSlot(ui.sess) || parseSlot(ui.sess).w !== w) ui.sess = (slots.find(s => ['today','planned'].includes(s.status)) || slots[0]).id;
  let s = slot(parseSlot(ui.sess).w, parseSlot(ui.sess).key);
  const wi = s.info, plan = slotPlan(s), vg = vigilanceToday(), props = allProposals();
  const weekNav = `<div class="flex items-center gap-2">${btn('‹', 'sess-week', `data-v="${w-1}" ${w <= 1 ? 'disabled' : ''} aria-label="Semaine précédente"`, 'ghost')}
    <div class="text-sm font-semibold min-w-[7rem] text-center">Semaine ${w}${w === cw ? ' · en cours' : ''}</div>${btn('›', 'sess-week', `data-v="${w+1}" aria-label="Semaine suivante"`, 'ghost')}</div>`;
  return `${pageHead('Séances', `Phase ${wi.phase} · ${PHASES[wi.phase-1].name}${wi.projected ? ' · <span class="text-txt-3">prévisionnel</span>' : ''}${wi.deload ? ' · <span class="text-warn">semaine d’allègement & bilan (−1 série)</span>' : ''}`, weekNav)}
  <main class="px-4 lg:px-8 space-y-4 max-w-6xl fade-in">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">${slots.map(x => `<button data-a="pick-slot" data-v="${x.id}" class="text-left rounded-2xl border p-3 ${x.id === s.id ? 'border-blue bg-blue/10' : 'border-ink-3 bg-ink-1 hover:border-txt-3'}">
      <div class="flex items-center justify-between"><span class="font-display text-xl font-bold">${x.meta.icon} ${x.key}</span><span class="text-[11px] text-txt-3">${DAYS_S[dow(x.date)]} ${fmtS(x.date)}</span></div>
      <div class="text-sm font-medium mt-1 leading-tight">${x.meta.name}</div><div class="mt-2">${statusChip(x.status)}${x.postponed ? ' <span class="chip bg-ink-3 text-txt-2">reportée</span>' : ''}</div></button>`).join('')}</div>
    ${props.length ? `<details class="card p-4"><summary class="flex justify-between items-center"><span class="font-semibold">Ajustements proposés (${props.length})</span><span class="text-txt-3">▾</span></summary><ul class="space-y-2 mt-3">${props.map(proposalRow).join('')}</ul></details>` : ''}
    <section class="card p-4 lg:p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><div class="text-xs uppercase tracking-widest text-txt-3">Séance ${s.key} · S${s.w} · ${fmtLong(s.date)}</div>
          <h2 class="font-display text-2xl lg:text-3xl font-bold">${s.meta.icon} ${s.meta.name}</h2>
          <div class="text-sm text-txt-3 mt-1">${plan.length} exercices · ${s.meta.calf ? 'séance exigeante pour les mollets' : 'séance peu exigeante pour les mollets'}</div></div>
        <div class="flex flex-wrap gap-2">${s.status === 'replaced' ? btn('Garder cette séance', 'slot-keep', `data-v="${s.id}"`, 'ghost') : ''}
          ${s.log ? btn('Voir le bilan', 'show-log', `data-v="${s.log.id}"`, 'ghost') : btn('📅 Déplacer', 'sheet-slot', `data-v="${s.id}"`, 'ghost')}
          ${DB().active && DB().active.slot === s.id ? btn('Reprendre la séance', 'run-open') : btn(s.log ? 'Refaire la séance' : 'Commencer la séance', 'run-start', `data-v="${s.id}"`)}</div>
      </div>
      ${s.status === 'replaced' ? `<div class="mt-3 rounded-xl bg-blue/10 border border-blue/30 p-3 text-sm">Cette séance est remplacée par un entraînement collectif cette semaine (les collectifs remplacent progressivement les séances personnelles au lieu de s’ajouter).</div>` : ''}
      ${vg.global === 'unknown' ? `<div class="mt-3 rounded-xl bg-ink-2 p-3 text-sm flex flex-wrap items-center justify-between gap-2"><span>Fais ton suivi du jour avant de commencer : il conditionne les adaptations.</span>${btn('Suivi du jour', 'tab', 'data-v="care"', 'ghost')}</div>` : ''}
      <div class="mt-4 space-y-2.5">${plan.map((p, i) => ficheCard(p, i, vg)).join('')}</div>
    </section>
  </main>`;
}
function lastDone(id) {
  const h = exHistory(id); if (!h.length) return null;
  const x = h[h.length-1]; const ds = (x.e.sets||[]).filter(s => s.done);
  return { date:x.log.date, sets: ds, rpe: x.e.rpe };
}
function ficheCard(p, i, vg) {
  const ex = p.ex, open = ui.open['f-'+p.id], v = exVigilance(ex, vg), ld = lastDone(p.id), notes = exState(p.id).notes || '';
  const realised = ld ? (ex.kind === 'strength' && !ex.repsProg ? ld.sets.map(s => `${s.reps}×${s.load}`).join(' · ') + ' kg' : `${ld.sets.length} série(s)/bloc(s)`) : '—';
  return `<article class="rounded-2xl bg-ink-2/60 border border-ink-3 overflow-hidden">
    <button data-a="toggle" data-v="f-${p.id}" class="w-full text-left p-3.5 flex gap-3 items-start" aria-expanded="${!!open}">
      <span class="font-mono text-xs text-txt-3 mt-1 w-4">${i+1}</span>
      <div class="flex-1 min-w-0"><div class="flex flex-wrap items-center gap-1.5"><span class="text-[10px] uppercase tracking-wider text-txt-3">${ex.fam}</span>${ex.zone ? `<span class="chip bg-ink-3 text-txt-2 !text-[10px]">${ex.zone === 'calf' ? 'Mollets' : 'Épaule'}</span>` : ''}${ex.impact ? '<span class="chip bg-ink-3 text-txt-2 !text-[10px]">Impact</span>' : ''}${ex.zone && v.level !== 'green' && v.level !== 'unknown' ? vigChip(v.level) : ''}</div>
        <div class="font-semibold mt-0.5">${ex.n}</div>
        <div class="text-blue font-display text-lg font-semibold leading-tight">${p.text}</div>
        ${p.target ? `<div class="text-xs text-txt-2">${p.target}</div>` : ''}
        <div class="text-xs text-txt-3">Repos ${p.rest} · ${p.rpeText}</div></div>
      <span class="text-txt-3 mt-1 ${open ? 'rotate-180' : ''}">▾</span></button>
    ${open ? `<div class="px-3.5 pb-4 fade-in text-sm">
      <div class="grid sm:grid-cols-2 gap-3">
        <div><div class="lbl">Objectif</div><p class="text-txt-2">${ex.obj}</p></div>
        <div><div class="lbl">Muscles sollicités</div><p class="text-txt-2">${ex.mus}</p></div>
      </div>
      <div class="lbl mt-3">Description technique</div><p class="text-txt-2 leading-relaxed">${ex.tech}</p>
      ${p.drills ? `<div class="lbl mt-3">Exercices du niveau ${p.level} (${LEVEL_NAMES[p.level-1]})</div><ul class="text-txt-2 list-disc pl-5">${p.drills.map(d => `<li>${d}</li>`).join('')}</ul>` : ''}
      <div class="grid lg:grid-cols-2 gap-3 mt-3"><div><div class="lbl">Schéma</div><pre class="schema">${esc(ex.schema)}</pre></div>
        <div><div class="lbl">Consignes biomécaniques</div><ul class="space-y-1 text-txt-2">${ex.cues.map(c => `<li>• ${c}</li>`).join('')}</ul>
        <div class="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div class="rounded-lg bg-ink-1 p-2"><div class="text-txt-3">Séries × rép.</div><b>${p.sets} × ${p.reps ?? (p.ladder ? p.ladder.reps/p.ladder.blocks : '—')}</b></div>
          <div class="rounded-lg bg-ink-1 p-2"><div class="text-txt-3">Charge prévue</div><b>${p.load != null ? p.load + ' ' + ex.unit : ex.kind === 'time' ? p.reps + ' s' : '—'}</b></div>
          <div class="rounded-lg bg-ink-1 p-2"><div class="text-txt-3">Dernière réalisée</div><b>${realised}</b>${ld ? `<div class="text-txt-3">${fmtS(ld.date)} · RPE ${ld.rpe ?? '—'}</div>` : ''}</div>
          <div class="rounded-lg bg-ink-1 p-2"><div class="text-txt-3">Repos · RPE</div><b>${p.rest} · ${p.rpe}</b></div></div></div></div>
      <div class="grid sm:grid-cols-2 gap-3 mt-3">
        <div class="rounded-xl bg-good/10 border border-good/25 p-3"><div class="lbl !text-good">✓ Critères de réussite</div><ul class="space-y-1">${ex.ok.map(c => `<li>• ${c}</li>`).join('')}</ul></div>
        <div class="rounded-xl bg-bad/10 border border-bad/25 p-3"><div class="lbl !text-bad">■ Critères d’arrêt</div><ul class="space-y-1">${ex.stop.map(c => `<li>• ${c}</li>`).join('')}</ul></div></div>
      ${exState(p.id).rule ? `<div class="mt-3 rounded-xl bg-ink-1 p-3 text-xs"><b>Règle du kiné :</b> ${esc(exState(p.id).rule)}</div>` : ex.inj ? `<p class="mt-3 text-xs text-txt-3">Exercice lié à une blessure : règle de validation renforcée (exécution parfaite, ${exState(p.id).need || 3} séances validées, sensations 24/48 h). Ajoute la règle de ton kiné dans Paramètres → Exercices.</p>` : ''}
      <label class="block mt-3"><span class="lbl">Notes personnelles</span><textarea data-note="${p.id}" rows="2" class="inp w-full" placeholder="Réglages machine, sensations, consignes du kiné…">${esc(notes)}</textarea></label>
    </div>` : ''}</article>`;
}
