/* =====================================================================
   PROGRAMME
   ===================================================================== */
const PH_COL = ['#3d8bfd','#7c6cf0','#34c77b','#f2b84b'];
function vProg() {
  const tabs = [['overview','Vue 16 semaines'],['phases','Phases & validation'],['types','Séances types'],['agility','Proprio & agilité']];
  const body = { overview: progOverview, phases: progPhases, types: progTypes, agility: progAgility }[ui.progTab]();
  return `${pageHead('Programme', 'Structure du cycle, contenu des séances et validation manuelle des paliers.')}
  <main class="px-4 lg:px-8 space-y-4 max-w-7xl fade-in">
    <div class="scroll-x flex gap-1.5">${tabs.map(([k,l]) => `<button data-a="prog-tab" data-v="${k}" class="shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-medium border ${ui.progTab===k ? 'bg-blue text-white border-blue' : 'border-ink-3 text-txt-2'}">${l}</button>`).join('')}</div>${body}</main>`;
}
function progOverview() {
  const cw = calWeek(), last = Math.max(16, cw);
  let rows = '';
  for (let w = 1; w <= last; w++) {
    const wi = weekInfo(w), sl = weekSlots(w), coll = collectivesOfWeek(w);
    const type = wi.extended ? '<span class="text-warn">Prolongation</span>' : wi.deload ? (wi.phase === 2 ? 'Allègement · évaluation avant reprise' : wi.phase === 4 ? 'Allègement · bilan final' : 'Allègement · bilan') : w === ST().settings.collective.week ? 'Objectif reprise collective' : 'Charge';
    rows += `<tr class="border-t border-ink-3 ${w === cw ? 'bg-blue/5' : ''}">
      <td class="py-2 pl-2"><div class="flex items-center gap-2"><span class="w-1.5 h-8 rounded-full" style="background:${PH_COL[wi.phase-1]};opacity:${wi.projected ? .45 : 1}"></span><div><b>S${w}</b>${w === cw ? ' <span class="text-blue text-xs">●</span>' : ''}<div class="text-[11px] text-txt-3">${fmtS(weekStart(w))}</div></div></div></td>
      <td class="text-xs"><div>P${wi.phase} · sem. ${wi.idx}</div><div class="text-txt-3">${type}</div></td>
      ${sl.map(s => `<td class="px-1"><button data-a="sheet-slot" data-v="${s.id}" class="w-full rounded-lg px-1.5 py-1.5 text-[11px] ${STATUS[s.status].c}" title="${s.meta.name} · ${STATUS[s.status].l}">${STATUS[s.status].i} ${s.key}</button></td>`).join('')}
      <td class="text-center text-xs">${coll.length ? `🤾 ${coll.length}` : '—'}</td></tr>`;
  }
  return `${card(`<div class="grid sm:grid-cols-4 gap-2">${PHASES.map(p => `<div class="rounded-xl bg-ink-2 p-3 border-l-4" style="border-color:${PH_COL[p.n-1]}"><div class="text-xs text-txt-3">Phase ${p.n} · S${(p.n-1)*4+1}–S${p.n*4} prévues</div><div class="font-semibold leading-tight">${p.name}</div></div>`).join('')}</div>
    <p class="text-xs text-txt-3 mt-3">Les semaines futures sont prévisionnelles : tu ne changes de phase que par validation manuelle (onglet « Phases & validation »). À partir de la phase 3, les entraînements collectifs remplacent progressivement les séances D puis B.</p>`)}
    ${card(`<div class="overflow-x-auto"><table class="w-full text-sm min-w-[560px]"><thead class="text-xs text-txt-3"><tr><th class="text-left pl-2">Semaine</th><th class="text-left">Type</th>${['A','B','C','D'].map(k => `<th title="${SESSIONS[k].name}">${SESSIONS[k].icon} ${k}</th>`).join('')}<th>Collectif</th></tr></thead><tbody>${rows}</tbody></table></div>`)}`;
}
function phaseEvidence(p) {
  const ws = Array.from({length: Math.max(16, calWeek())}, (_, i) => i+1).filter(w => weekInfo(w).phase === p && !weekInfo(w).projected);
  const sl = ws.flatMap(w => weekSlots(w)), done = sl.filter(s => s.status === 'done').length, inc = sl.filter(s => s.status === 'incomplete').length;
  const pains = ws.map(w => weekStats(w).painCalf).filter(v => v != null);
  return ws.length ? `${done} terminées, ${inc} incomplètes sur ${sl.length} prévues · douleur mollets moy. ${pains.length ? `S${ws[0]} ${pains[0]} → S${ws[ws.length-1]} ${pains[pains.length-1]}` : '—'}` : 'Phase pas encore commencée';
}
function progPhases() {
  const cur = curPhaseEntry();
  return PHASES.map(p => {
    const h = ST().phase.history.find(x => x.phase === p.n), next = ST().phase.history.find(x => x.phase === p.n + 1);
    const state = next ? 'done' : h ? 'current' : 'future';
    const cr = ST().criteria[p.n] || [], ok = cr.filter(c => c.status === 'ok').length;
    const bil = ST().bilans[p.n] || { results:{} };
    const sts = [['todo','À évaluer'],['ok','Validé','good'],['ko','Non validé','bad'],['reeval','À réévaluer','warn']];
    return card(`<div class="flex flex-wrap items-start justify-between gap-3"><div><div class="text-xs uppercase tracking-widest font-semibold" style="color:${PH_COL[p.n-1]}">Phase ${p.n}</div><h2 class="font-display text-2xl font-bold">${p.name}</h2>
        <p class="text-sm text-txt-2 mt-1 max-w-3xl">${p.goal}</p><div class="flex flex-wrap gap-1.5 mt-2">${p.focus.map(f => `<span class="chip bg-ink-2 text-txt-2">${f}</span>`).join('')}</div></div>
        <div class="text-right">${state === 'done' ? `<span class="chip bg-good/15 text-good">✓ Validée${next.validatedAt ? ' le ' + fmtS(next.validatedAt) : ''}</span>` : state === 'current' ? `<span class="chip bg-blue/15 text-blue">En cours depuis S${h.startWeek}</span>` : '<span class="chip bg-ink-3 text-txt-2">À venir</span>'}
        <div class="text-xs text-txt-3 mt-1">${ok}/${cr.length} critères validés</div></div></div>
      ${state !== 'future' ? `<p class="text-xs text-txt-3 mt-3">Indicateurs (aide à la décision, pas une validation) : ${phaseEvidence(p.n)}</p>` : ''}
      <details class="mt-4" ${state === 'current' || ui.open['ph-'+p.n] ? 'open' : ''}><summary class="text-sm font-semibold text-blue">Critères de validation (${ok}/${cr.length}) ▾</summary><div class="mt-2 space-y-2">${cr.map(c => `<div class="rounded-xl bg-ink-2 p-3"><div class="flex flex-wrap items-start justify-between gap-2"><div class="text-sm font-medium flex-1 min-w-[12rem]">${esc(c.label)}</div>
          ${chips(`crit:${p.n}:${c.id}`, c.status, sts)}</div>
          <div class="grid sm:grid-cols-[10rem_1fr] gap-2 mt-2"><input type="date" data-crit="date" data-p="${p.n}" data-v="${c.id}" value="${c.date || ''}" class="inp" aria-label="Date de validation"><input data-crit="comment" data-p="${p.n}" data-v="${c.id}" value="${esc(c.comment || '')}" class="inp" placeholder="Commentaire (ex. validé avec le kiné)"></div></div>`).join('')}</div></details>
      <details class="mt-4" ${ui.open['bil-'+p.n] ? 'open' : ''}><summary data-a="toggle" data-v="bil-${p.n}" class="font-semibold text-sm">🩺 ${p.n === 2 ? 'Évaluation fonctionnelle avant reprise collective' : p.n === 4 ? 'Bilan final de progression' : `Bilan fonctionnel de fin de phase ${p.n}`} ▾</summary>
        <p class="text-xs text-txt-3 mt-2">Saisis uniquement des résultats réellement mesurés (idéalement avec ton kiné). Rien n’est rempli automatiquement. Symétrie = plus faible / plus fort.</p>
        <div class="grid sm:grid-cols-[10rem_1fr] gap-2 mt-2"><input type="date" data-bilan="date" data-p="${p.n}" value="${bil.date || ''}" class="inp" aria-label="Date du bilan"><input data-bilan="comment" data-p="${p.n}" value="${esc(bil.comment || '')}" class="inp" placeholder="Commentaire du bilan"></div>
        <div class="overflow-x-auto mt-2"><table class="w-full text-sm min-w-[520px]"><thead class="text-xs text-txt-3"><tr><th class="text-left">Test</th><th>Gauche / valeur</th><th>Droite</th><th>Symétrie</th></tr></thead><tbody>${TESTS.map(t => { const r = (bil.results || {})[t.id] || {};
          return `<tr class="border-t border-ink-3"><td class="py-2 pr-2">${t.n} <span class="text-txt-3 text-xs">(${t.unit})</span></td><td class="px-1"><input type="number" step="any" data-test="L" data-p="${p.n}" data-v="${t.id}" value="${r.L ?? ''}" class="inp w-full text-center"></td>
          <td class="px-1">${t.bi ? `<input type="number" step="any" data-test="R" data-p="${p.n}" data-v="${t.id}" value="${r.R ?? ''}" class="inp w-full text-center">` : ''}</td><td class="text-center text-xs">${t.bi ? lsi(r.L, r.R) : ''}</td></tr>`; }).join('')}</tbody></table></div></details>
      ${state === 'current' && p.n < 4 ? `<div class="mt-4 pt-4 border-t border-ink-3 flex flex-wrap items-center justify-between gap-3"><p class="text-xs text-txt-3 max-w-xl">Le passage de phase est toujours manuel : la fin du calendrier ne suffit pas. Tant que tu ne valides pas, la phase se prolonge en semaines de consolidation.</p>${btn(`Valider le passage en phase ${p.n+1}`, 'phase-validate', `data-v="${p.n}"`, ok === cr.length ? 'good' : 'ghost')}</div>` : ''}
      ${state === 'done' && cur.phase === p.n + 1 && !DB().logs.some(l => l.phase === p.n + 1) ? `<div class="mt-3 text-right"><button data-a="phase-undo" class="text-xs text-txt-3 underline">Annuler la validation</button></div>` : ''}`, state === 'current' ? 'border-blue/40' : '');
  }).join('');
}
function progTypes() {
  const p = ui.progPhase, k = ui.progKey, items = sessionItems(p, k), custom = !!(ST().custom[p] && ST().custom[p][k]);
  const wi = { phase:p, idx:1, deload:false };
  return `${card(`<div class="flex flex-wrap gap-2 items-center justify-between"><div class="flex flex-wrap gap-1.5">${PHASES.map(x => `<button data-a="prog-phase" data-v="${x.n}" class="min-h-[40px] px-3 rounded-xl text-sm border ${p===x.n ? 'border-blue text-blue bg-blue/10' : 'border-ink-3 text-txt-2'}">P${x.n}</button>`).join('')}</div>
      <div class="flex flex-wrap gap-1.5">${Object.values(SESSIONS).map(s => `<button data-a="prog-key" data-v="${s.key}" class="min-h-[40px] px-3 rounded-xl text-sm border ${k===s.key ? 'border-blue text-blue bg-blue/10' : 'border-ink-3 text-txt-2'}">${s.icon} ${s.key} · ${s.short}</button>`).join('')}</div></div>`)}
    ${card(`${h2(`Phase ${p} · Séance ${k} — ${SESSIONS[k].name}`, `<div class="flex gap-2">${custom ? btn('Rétablir le programme initial', 'prog-reset', '', 'ghost') : ''}${btn(ui.editProg ? 'Terminer' : 'Modifier les exercices', 'prog-edit', '', ui.editProg ? 'good' : 'ghost')}</div>`)}
      ${custom ? '<p class="text-xs text-warn mb-2">Séance personnalisée (différente du programme initial).</p>' : ''}
      <ol class="space-y-2">${items.map((it, i) => { const pr = prescribe(it, wi);
        return `<li class="rounded-xl bg-ink-2 p-3"><div class="flex items-start gap-3"><span class="font-mono text-xs text-txt-3 mt-1">${i+1}</span><div class="flex-1 min-w-0"><div class="font-medium">${EX[it[0]].n}</div><div class="text-sm text-blue">${pr.text}</div><div class="text-xs text-txt-3">RPE ${it[3]} · repos ${it[4]}</div></div>
          ${ui.editProg ? `<div class="flex gap-1">${btn('↑', 'it-move', `data-v="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter"`, 'ghost')}${btn('↓', 'it-move', `data-v="${i}" data-d="1" ${i === items.length-1 ? 'disabled' : ''} aria-label="Descendre"`, 'ghost')}${btn('✕', 'it-del', `data-v="${i}" aria-label="Retirer"`, 'danger')}</div>` : ''}</div>
          ${ui.editProg && ['strength','time'].includes(EX[it[0]].kind) ? `<div class="grid grid-cols-4 gap-2 mt-2">${[['1','Séries'],['2','Rép.'],['3','RPE'],['4','Repos']].map(([f,l]) => `<label class="text-xs"><span class="text-txt-3">${l}</span><input data-it="${f}" data-v="${i}" value="${esc(it[+f])}" class="inp w-full"></label>`).join('')}</div>` : ''}</li>`; }).join('')}</ol>
      ${ui.editProg ? `<div class="flex gap-2 mt-3"><select id="it-add" class="inp flex-1">${Object.entries(EX).map(([id, e]) => `<option value="${id}">${e.fam} — ${e.n}</option>`).join('')}</select>${btn('Ajouter', 'it-add')}</div>
        <p class="text-xs text-txt-3 mt-2">Les charges, répétitions de départ et règles de progression se règlent dans Paramètres → Exercices.</p>` : ''}`)}`;
}
function progAgility() {
  const ph = weekInfo(calWeek()).phase;
  return `${card(`<p class="text-sm text-txt-2">Catégorie indépendante, intégrée aux séances A et D. Progression par niveau : ${LEVEL_NAMES.map((l, i) => `<b>${i+1}</b> ${l}`).join(' · ')}. Le niveau maximal dépend de la phase (charge mécanique) et une proposition de passage n’apparaît qu’après validation de séances sans symptôme à 24 h et 48 h.</p>`)}
  <div class="grid lg:grid-cols-3 gap-4">${Object.entries(FAMILIES).map(([k, f]) => { const lv = ST().levels[k] || 1, mx = FAMILY_MAX[k][ph];
    return card(`${h2(`${f.icon} ${f.name}`, `<span class="chip bg-blue/15 text-blue">Niveau ${Math.min(lv, mx)}</span>`)}
      <div class="text-xs text-txt-3 mb-3">Maximum autorisé en phase ${ph} : niveau ${mx}</div>
      <ol class="space-y-2">${f.levels.map((L, i) => `<li class="rounded-xl p-3 ${i+1 === Math.min(lv, mx) ? 'bg-blue/10 border border-blue/40' : i+1 > mx ? 'bg-ink-2 opacity-50' : 'bg-ink-2'}">
        <div class="flex justify-between text-sm"><b>${i+1}. ${LEVEL_NAMES[i]}</b><span class="text-[11px] text-txt-3">charge méca. ${'●'.repeat(L.load)}${'○'.repeat(3-L.load)}</span></div>
        <ul class="text-xs text-txt-2 mt-1 space-y-0.5">${L.drills.map(d => `<li>• ${d}</li>`).join('')}</ul>${i+1 > mx ? '<div class="text-[11px] text-txt-3 mt-1">🔒 après validation de phase</div>' : ''}</li>`).join('')}</ol>
      <div class="flex gap-2 mt-3">${btn('− Niveau', 'lvl', `data-v="${k}" data-d="-1" ${lv <= 1 ? 'disabled' : ''}`, 'ghost')}${btn('+ Niveau', 'lvl', `data-v="${k}" data-d="1" ${lv >= mx ? 'disabled' : ''}`, 'ghost')}</div>
      <p class="text-[11px] text-txt-3 mt-2">Réglage manuel possible (ex. sur consigne du kiné), dans la limite de la phase.</p>`); }).join('')}</div>`;
}

/* =====================================================================
   PARAMÈTRES
   ===================================================================== */
function vSet() {
  const tabs = [['profil','Profil'],['calendrier','Calendrier'],['seuils','Seuils de vigilance'],['exercices','Exercices & charges'],['objectifs','Objectifs'],['donnees','Données & synchro']];
  const st = ST(), pr = st.profile, se = st.settings;
  const f = (bind, label, val, type = 'text', extra = '') => `<label class="block"><span class="lbl">${label}</span><input type="${type}" data-set="${bind}" value="${esc(val ?? '')}" class="inp w-full" ${extra}></label>`;
  let body = '';
  if (ui.setTab === 'profil') body = card(`<div class="grid sm:grid-cols-3 gap-3">${f('profile.age','Âge',pr.age,'number')}${f('profile.weight','Poids (kg)',pr.weight,'number')}${f('profile.height','Taille (cm)',pr.height,'number')}${f('profile.post','Poste',pr.post)}${f('profile.level','Niveau visé',pr.level)}${f('profile.vma','VMA (km/h) — optionnel',pr.vma,'number','step="0.1" placeholder="ex. 16"')}</div>
    <p class="text-xs text-txt-3 mt-2">La VMA sert uniquement à calculer les distances et allures cibles du fractionné. Laisse vide si tu ne l’as pas mesurée : l’app n’invente aucune valeur.</p>
    <label class="block mt-3"><span class="lbl">Recommandations du kiné</span><textarea data-set="profile.notesKine" rows="4" class="inp w-full" placeholder="Consignes, exercices préventifs, limites…">${esc(pr.notesKine)}</textarea></label>
    <div class="mt-3 rounded-xl bg-ink-2 p-3 text-sm text-txt-2"><b class="text-txt-1">Antécédents pris en compte</b> : déchirure mollet gauche (fin janvier, presque récupéré) · déchirure mollet droit (~11 mois) · instabilité épaule droite (fonctionnelle) · 4,5 km sans douleur · fractionné court/long autorisé · impulsions/réceptions travaillées avec le kiné.</div>`);
  if (ui.setTab === 'calendrier') body = card(`<div class="grid sm:grid-cols-2 gap-3">${f('settings.startDate','Début du cycle (lundi de la semaine 1)',se.startDate,'date')}
      <div><span class="lbl">Semaine en cours</span><div class="inp">S${calWeek()}</div></div></div>
    <div class="lbl mt-4">Jours des séances</div><div class="grid sm:grid-cols-2 gap-2">${Object.values(SESSIONS).map(s => `<label class="flex items-center justify-between gap-2 rounded-xl bg-ink-2 px-3 py-2 text-sm"><span>${s.icon} ${s.key} · ${s.name}</span>
      <select data-set="settings.days.${s.key}" class="inp !w-auto">${DAYS.map((d, i) => `<option value="${i}" ${se.days[s.key] === i ? 'selected' : ''}>${d}</option>`).join('')}</select></label>`).join('')}</div>
    ${daysWarning()}
    <div class="lbl mt-4">Entraînements collectifs</div><div class="grid sm:grid-cols-3 gap-3">${f('settings.collective.week','Semaine visée de reprise',se.collective.week,'number','min="1" max="20"')}${f('settings.collective.duration','Durée habituelle (min)',se.collective.duration,'number')}
      <div><span class="lbl">Jours habituels</span><div class="flex flex-wrap gap-1">${DAYS_S.map((d, i) => `<button data-a="coll-day" data-v="${i}" class="min-h-[40px] px-2.5 rounded-lg text-xs border ${se.collective.days.includes(i) ? 'border-blue text-blue bg-blue/10' : 'border-ink-3 text-txt-2'}">${d}</button>`).join('')}</div></div></div>
    <div class="mt-3 flex flex-wrap items-center gap-3">${btn('Planifier les collectifs sur 4 semaines', 'coll-plan', '', 'ghost')}<span class="text-xs text-txt-3">Crée les entraînements prévus à partir de la semaine visée (ou de la semaine en cours si plus tard).</span></div>`);
  if (ui.setTab === 'seuils') body = card(`<p class="text-sm text-txt-2 mb-3">Seuils orange (vigilance) et rouge (arrêt de l’exercice concerné). <b class="text-warn">À faire valider par ton professionnel de santé.</b></p>
    <div class="space-y-2">${Object.entries(se.thresholds).map(([k, t]) => `<div class="grid grid-cols-[1fr_5rem_5rem] gap-2 items-center rounded-xl bg-ink-2 px-3 py-2"><span class="text-sm">${t.label}${t.dir === 'down' ? ' <span class="text-txt-3 text-xs">(alerte si ≤)</span>' : ' <span class="text-txt-3 text-xs">(alerte si ≥)</span>'}</span>
      <label class="text-xs text-warn">Orange<input type="number" data-set="settings.thresholds.${k}.o" value="${t.o}" class="inp w-full"></label><label class="text-xs text-bad">Rouge<input type="number" data-set="settings.thresholds.${k}.r" value="${t.r}" class="inp w-full"></label></div>`).join('')}</div>
    <div class="grid sm:grid-cols-2 gap-3 mt-4">${f('settings.thresholdsValidated.by','Validés par (nom du professionnel)',se.thresholdsValidated.by)}${f('settings.thresholdsValidated.date','Date de validation',se.thresholdsValidated.date,'date')}</div>
    <div class="mt-3">${btn('Rétablir les valeurs par défaut', 'th-reset', '', 'ghost')}</div>`);
  if (ui.setTab === 'exercices') body = card(`<p class="text-sm text-txt-2 mb-3">Charges actuelles, pas de progression et règles de validation. Les exercices liés aux blessures exigent par défaut 3 séances validées et une exécution parfaite.</p>
    <div class="space-y-2">${Object.entries(EX).filter(([, e]) => ['strength','time'].includes(e.kind)).map(([id, e]) => { const s = exState(id);
      return `<details class="rounded-xl bg-ink-2 px-3 py-2"><summary class="flex items-center justify-between gap-2 text-sm min-h-[40px]"><span>${e.n}${e.inj ? ' <span class="chip bg-warn/15 text-warn !text-[10px]">blessure</span>' : ''}</span><b class="text-blue whitespace-nowrap">${fmtValue(id, curValue(id))}</b></summary>
        <div class="grid sm:grid-cols-4 gap-2 py-2">
          <label class="text-xs"><span class="text-txt-3">${e.kind === 'time' ? 'Durée (s)' : e.repsProg ? 'Répétitions' : 'Charge (' + e.unit + ')'}</span><input type="number" step="any" data-exo="${e.kind !== 'time' && e.repsProg ? 'reps' : 'load'}" data-v="${id}" value="${curValue(id)}" class="inp w-full"></label>
          ${!e.repsProg ? `<label class="text-xs"><span class="text-txt-3">Pas de progression</span><input type="number" step="any" data-exo="step" data-v="${id}" value="${s.step ?? e.step}" class="inp w-full"></label>` : '<div></div>'}
          <label class="text-xs"><span class="text-txt-3">Séances validées requises</span><input type="number" min="1" max="6" data-exo="need" data-v="${id}" value="${s.need ?? (e.inj ? 3 : 2)}" class="inp w-full"></label>
          <label class="text-xs sm:col-span-4"><span class="text-txt-3">Règle spécifique du kiné (affichée dans la fiche)</span><input data-exo="rule" data-v="${id}" value="${esc(s.rule || '')}" class="inp w-full" placeholder="ex. progression seulement si douleur ≤ 2 à 48 h et 20 rép. unipodales"></label></div></details>`; }).join('')}</div>
    <div class="lbl mt-4">Paliers actuels</div><div class="grid sm:grid-cols-2 gap-2">${['court','long'].map(l => `<label class="flex items-center justify-between gap-2 rounded-xl bg-ink-2 px-3 py-2 text-sm"><span>Fractionné ${l}</span><select data-lvl="${l}" class="inp !w-auto">${LADDERS[l].map((x, i) => `<option value="${i}" ${(st.levels[l]||0) === i ? 'selected' : ''}>P${i+1} · ${x.f}</option>`).join('')}</select></label>`).join('')}</div>`);
  if (ui.setTab === 'objectifs') body = card(`<label class="block"><span class="lbl">Objectif intermédiaire</span><input data-set="settings.objectives.collective" value="${esc(se.objectives.collective)}" class="inp w-full"></label>
    <label class="block mt-3"><span class="lbl">Objectif final</span><input data-set="settings.objectives.final" value="${esc(se.objectives.final)}" class="inp w-full"></label>
    <div class="lbl mt-4">Critères de validation des phases</div>${PHASES.map(p => `<div class="rounded-xl bg-ink-2 p-3 mt-2"><div class="font-semibold text-sm mb-2">Phase ${p.n} · ${p.short}</div>
      ${(st.criteria[p.n]||[]).map(c => `<div class="flex gap-2 mb-1.5"><input data-crit="label" data-p="${p.n}" data-v="${c.id}" value="${esc(c.label)}" class="inp flex-1">${btn('✕', 'crit-del', `data-p="${p.n}" data-v="${c.id}" aria-label="Supprimer"`, 'danger')}</div>`).join('')}
      ${btn('+ Ajouter un critère', 'crit-add', `data-p="${p.n}"`, 'ghost')}</div>`).join('')}`);
  if (ui.setTab === 'donnees') body = syncPanel() + card(`${h2('Sauvegarde')}<p class="text-sm text-txt-2">${Sync.mode === 'cloud' ? 'Tes données sont enregistrées dans ton espace privé et synchronisées entre tes appareils (copie locale en plus).' : 'Tes données sont enregistrées dans ce navigateur. Exporte-les régulièrement.'}</p>
    <div class="flex flex-wrap gap-2 mt-3">${btn('Exporter JSON', 'export', 'data-v="json"', 'ghost')}${btn('Exporter CSV (séances)', 'export', 'data-v="csv-s"', 'ghost')}${btn('Exporter CSV (séries)', 'export', 'data-v="csv-x"', 'ghost')}${btn('Exporter CSV (suivi quotidien)', 'export', 'data-v="csv-c"', 'ghost')}</div>
    <details class="mt-4"><summary class="text-sm text-blue">Importer une sauvegarde JSON ▾</summary><textarea id="import-box" rows="5" class="inp w-full mt-2 font-mono text-xs" placeholder="Colle ici le contenu du fichier JSON exporté"></textarea><div class="mt-2">${btn('Importer (remplace les données actuelles)', 'import', '', 'warn')}</div></details>`)
    + card(`${h2('Mode démo')}<p class="text-sm text-txt-2">Données fictives pour explorer l’app. Elles sont strictement séparées de tes vraies données et ne sont jamais enregistrées.</p>
      <div class="mt-3">${DEMO ? btn('Quitter la démo', 'demo-off', '', 'warn') : btn('Lancer la démo', 'demo-on', '', 'ghost')}</div>`)
    + card(`${h2('Réinitialiser')}<p class="text-sm text-txt-2">Efface toutes tes données réelles (séances, suivi, validations).</p><div class="mt-3">${btn(ui.confirmReset ? 'Confirmer : tout effacer' : 'Tout effacer', 'reset', '', 'danger')}</div>`);
  return `${pageHead('Paramètres', 'Personnalisation du programme, des seuils et des données.')}
  <main class="px-4 lg:px-8 space-y-4 max-w-4xl fade-in"><div class="scroll-x flex gap-1.5">${tabs.map(([k,l]) => `<button data-a="set-tab" data-v="${k}" class="shrink-0 min-h-[44px] px-4 rounded-xl text-sm font-medium border ${ui.setTab===k ? 'bg-blue text-white border-blue' : 'border-ink-3 text-txt-2'}">${l}</button>`).join('')}</div>${body}</main>`;
}
function daysWarning() {
  const d = ST().settings.days, calf = ['A','B','D'].map(k => d[k]).sort((a,b) => a-b), bad = [];
  for (let i = 0; i < calf.length; i++) for (let j = i+1; j < calf.length; j++) { const g = Math.min(Math.abs(calf[i]-calf[j]), 7 - Math.abs(calf[i]-calf[j])); if (g <= 1) bad.push([calf[i], calf[j]]); }
  return bad.length ? `<p class="text-sm text-warn mt-2">⚠ Séances exigeantes pour les mollets à moins de 48 h : ${bad.map(([a,b]) => `${DAYS[a]} / ${DAYS[b]}`).join(', ')}. Espace A, B et D d’au moins un jour.</p>` : `<p class="text-xs text-good mt-2">✓ A, B et D sont espacées d’au moins 48 h.</p>`;
}

/* =====================================================================
   SUPERPOSITIONS (feuille, modale)
   ===================================================================== */
function overlays() {
  let h = '';
  if (ui.sheet) {
    const inner = ui.sheet.type === 'slot' ? slotSheet(ui.sheet.id) : ui.sheet.type === 'ev' ? eventSheet(ui.sheet.id) : ui.sheet.type === 'log' ? logModal(ui.sheet.id) : ui.sheet.html;
    h += `<div class="fixed inset-0 z-40 flex items-end lg:items-center justify-center" role="dialog" aria-modal="true"><div class="absolute inset-0 bg-black/60" data-a="sheet-close"></div>
      <div class="relative w-full lg:max-w-xl max-h-[88vh] overflow-y-auto bg-ink-1 border border-ink-3 rounded-t-3xl lg:rounded-3xl p-5 pb-8 safe-b fade-in">
      <button data-a="sheet-close" class="absolute top-3 right-3 w-10 h-10 rounded-xl bg-ink-2 text-txt-2" aria-label="Fermer">✕</button>${inner}</div></div>`;
  }
  return h;
}
