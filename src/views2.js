/* =====================================================================
   SÉANCE EN DIRECT (runner)
   ===================================================================== */
function restSec(r) { const m = /(\d+)′(\d+)?/.exec(r || ''); if (m) return (+m[1])*60 + (+(m[2]||0)); const s = /(\d+)″/.exec(r || ''); return s ? +s[1] : 0; }
function startRun(sid) {
  const p = parseSlot(sid), s = slot(p.w, p.key), plan = slotPlan(s), vg = vigilanceToday();
  DB().active = { slot:sid, date: today(), startedAt: Date.now(), pausedAt:null, pausedMs:0, cur:0, restUntil:null, finishing:false,
    bilan:{ rpe:null, sens:null, pains:{}, comment:'' },
    items: plan.map(pr => {
      const ex = pr.ex, v = exVigilance(ex, vg);
      let sets;
      if (ex.kind === 'strength' || ex.kind === 'time') sets = Array.from({length: pr.sets}, () => ({ reps: pr.reps, load: pr.load, done:false }));
      else if (ex.kind === 'ladder') sets = Array.from({length: pr.ladder.blocks}, () => ({ done:false }));
      else if (ex.kind === 'level') sets = pr.drills.map(() => ({ done:false }));
      else sets = [{ done:false }];
      return { id: pr.id, pres:{ sets: pr.sets, reps: pr.reps, load: pr.load, rpe: pr.rpe, rest: pr.rest, text: pr.text, level: pr.level, step: pr.step, drills: pr.drills || null, target: pr.target || '' },
        sets, rpe:null, tech:null, pain:null, comment:'', stopped:false, km: pr.ladder ? '' : null, min: pr.ladder ? pr.ladder.min : null,
        vig: v.level, vigWhy: v.reasons, checked:false, override:false, swapped:null, adapted:null };
    }) };
  ui.runOpen = true; persist('active');
}
const runElapsed = a => Math.max(0, (a.pausedAt || Date.now()) - a.startedAt - a.pausedMs);
const mmss = ms => { const s = Math.floor(ms/1000); return `${Math.floor(s/3600) ? Math.floor(s/3600)+':' : ''}${pad(Math.floor(s/60)%60)}:${pad(s%60)}`; };

function vRunner() {
  const a = DB().active, p = parseSlot(a.slot), meta = SESSIONS[p.key];
  if (a.finishing) return vBilan(a);
  const total = a.items.reduce((n, it) => n + it.sets.length, 0), done = a.items.reduce((n, it) => n + it.sets.filter(s => s.done).length, 0);
  return `<div class="fixed inset-0 z-50 bg-ink-0 overflow-y-auto fade-in" id="runner">
    <header class="sticky top-0 z-10 bg-ink-0/95 backdrop-blur border-b border-ink-3 safe-t">
      <div class="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <button data-a="run-close" class="w-11 h-11 rounded-xl bg-ink-2 text-lg" aria-label="Réduire">⌄</button>
        <div class="flex-1 min-w-0"><div class="text-xs text-txt-3 truncate">S${p.w} · ${meta.name}</div>
          <div class="font-display text-2xl font-bold tabular-nums" id="elapsed">${mmss(runElapsed(a))}</div></div>
        ${a.pausedAt ? btn('▶ Reprendre', 'run-pause', '', 'good') : btn('❚❚ Pause', 'run-pause', '', 'ghost')}
      </div>
      <div class="h-1 bg-ink-3"><div class="h-1 bg-good transition-all" style="width:${total ? done/total*100 : 0}%"></div></div>
    </header>
    ${a.pausedAt ? `<div class="max-w-3xl mx-auto px-4 pt-3"><div class="rounded-xl bg-warn/15 text-warn p-3 text-sm text-center">Séance en pause — le chronomètre est arrêté.</div></div>` : ''}
    <main class="max-w-3xl mx-auto px-4 py-4 space-y-3 pb-40">
      ${a.items.map((it, i) => runItem(a, it, i)).join('')}
    </main>
    ${a.restUntil && a.restUntil > Date.now() ? `<div class="fixed bottom-24 inset-x-0 z-20 flex justify-center px-4"><div class="rounded-2xl bg-blue text-white px-5 py-3 shadow-2xl flex items-center gap-4">
      <span class="text-sm">Repos</span><b class="font-display text-3xl tabular-nums" id="rest">${mmss(a.restUntil - Date.now())}</b><button data-a="rest-skip" class="text-sm underline">Passer</button></div></div>` : ''}
    <footer class="fixed bottom-0 inset-x-0 z-20 bg-ink-1/95 backdrop-blur border-t border-ink-3 safe-b">
      <div class="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3"><div class="text-sm text-txt-2 flex-1">${done}/${total} séries validées</div>
        ${btn('Terminer la séance', 'run-finish', '', done === total ? 'good' : 'primary')}</div></footer>
  </div>`;
}
function runItem(a, it, i) {
  const ex = EX[it.id], open = a.cur === i, nd = it.sets.filter(s => s.done).length, th = TH().sessionPain;
  const complete = nd === it.sets.length;
  const blocked = it.vig === 'red' && !it.override;
  const head = `<button data-a="run-cur" data-v="${i}" class="w-full text-left flex items-center gap-3 p-4">
      <span class="w-8 h-8 shrink-0 rounded-full grid place-items-center text-sm font-bold ${it.stopped ? 'bg-bad/20 text-bad' : complete ? 'bg-good text-ink-0' : nd ? 'bg-warn/25 text-warn' : 'bg-ink-3 text-txt-2'}">${it.stopped ? '■' : complete ? '✓' : i+1}</span>
      <div class="flex-1 min-w-0"><div class="font-semibold leading-tight">${it.swapped ? `<span class="line-through text-txt-3">${ex.n}</span><br>${esc(it.swapped)}` : ex.n}</div>
        <div class="text-xs text-txt-3">${esc(it.pres.text)} · ${nd}/${it.sets.length}${it.adapted ? ' · <span class="text-warn">adapté</span>' : ''}</div></div>
      ${it.vig === 'red' || it.vig === 'orange' ? vigChip(it.vig) : ''}<span class="text-txt-3">${open ? '▴' : '▾'}</span></button>`;
  if (!open) return `<article class="card overflow-hidden ${complete ? 'opacity-70' : ''}">${head}</article>`;

  let body = '';
  if (it.vig === 'red' && !it.override) {
    body += `<div class="rounded-xl bg-bad/10 border border-bad/40 p-3 text-sm"><b class="text-bad">Vigilance rouge sur cette zone</b> (${it.vigWhy.join(', ')}).<br>Cet exercice est à l’arrêt aujourd’hui. Demande un avis médical ou kiné si les symptômes persistent ou s’aggravent.
      <div class="flex flex-wrap gap-2 mt-3">${btn('Passer cet exercice', 'run-stop', `data-v="${i}"`, 'danger')}<button data-a="run-override" data-v="${i}" class="text-xs text-txt-3 underline">Mon kiné m’a autorisé à le faire</button></div></div>`;
  } else if (it.vig === 'orange' && !it.adapted && !it.dismissed) {
    body += `<div class="rounded-xl bg-warn/10 border border-warn/40 p-3 text-sm"><b class="text-warn">Vigilance orange</b> : ${it.vigWhy.join(', ')}.
      <p class="text-txt-2 mt-1">Rien n’est modifié automatiquement. Réévalue d’abord : échauffement progressif, puis un test simple (10 montées sur pointe unipodales ou quelques foulées) en notant la douleur.</p>
      <label class="flex items-start gap-2 mt-2 cursor-pointer"><input type="checkbox" data-a="run-check" data-v="${i}" ${it.checked ? 'checked' : ''} class="mt-1 w-5 h-5 accent-[#f2b84b]"><span>J’ai vérifié mes symptômes et les consignes de mon kiné</span></label>
      <div class="flex flex-wrap gap-2 mt-3">${btn('Réduire l’intensité (−20 %)', 'run-adapt', `data-v="${i}" data-m="reduce" ${it.checked ? '' : 'disabled'}`, 'warn')}
        ${ex.alt ? btn('Alternative : ' + ex.alt.split(',')[0], 'run-adapt', `data-v="${i}" data-m="alt" ${it.checked ? '' : 'disabled'}`, 'ghost') : ''}
        ${btn('Garder le prévu', 'run-adapt', `data-v="${i}" data-m="keep" ${it.checked ? '' : 'disabled'}`, 'ghost')}${btn('Passer', 'run-stop', `data-v="${i}"`, 'ghost')}</div></div>`;
  }
  if (!blocked) {
    if (it.pres.target) body += `<div class="text-sm text-txt-2">🎯 ${esc(it.pres.target)}</div>`;
    body += `<div class="space-y-2">${it.sets.map((s, k) => setRow(ex, it, i, s, k)).join('')}</div>`;
    if (ex.kind === 'ladder') body += `<div class="grid grid-cols-2 gap-2"><label><span class="lbl">Distance (km)</span><input type="number" inputmode="decimal" step="0.1" data-run="km" data-i="${i}" value="${it.km ?? ''}" class="inp w-full" placeholder="ex. 4.2"></label>
      <label><span class="lbl">Temps de course (min)</span><input type="number" inputmode="numeric" data-run="min" data-i="${i}" value="${it.min ?? ''}" class="inp w-full"></label></div>`;
    if (ex.kind !== 'check' && nd > 0) { const fb = it.fb;
      body += `<div class="rounded-xl ${fb ? 'bg-ink-2' : 'bg-blue/10 border border-blue/40'} p-3"><div class="font-semibold text-sm mb-2">${fb ? 'Ressenti noté' : 'Comment c’était ?'} <span class="text-txt-3 font-normal">(sert aux propositions de progression)</span></div>
        <div class="grid grid-cols-2 gap-1.5">${[['easy','😌 Facile','good'],['ok','👍 Comme prévu','good'],['hard','😤 Dur','warn'],['bad','⚠ Technique dégradée','bad']].map(([k,l,tone]) => { const on = fb === k;
          return `<button data-a="pick" data-g="fb:${i}" data-v="${k}" class="min-h-[48px] rounded-xl border text-sm font-semibold ${on ? ({good:'bg-good text-ink-0 border-good',warn:'bg-warn text-ink-0 border-warn',bad:'bg-bad text-ink-0 border-bad'})[tone] : 'border-ink-3 bg-ink-1 text-txt-2'}">${l}</button>`; }).join('')}</div>
        <details class="mt-2" ${ui.open['rpe-'+i] ? 'open' : ''}><summary data-a="toggle" data-v="rpe-${i}" class="text-xs text-blue">Préciser le RPE (cible ${it.pres.rpe})${it.rpe ? ' · actuel ' + it.rpe : ''}</summary><div class="mt-2">${chips('rpe:'+i, it.rpe, rpeOpts(), 'grid grid-cols-5')}</div></details></div>`; }
    body += `<div class="rounded-xl bg-ink-2 p-3">${it.pain ? `<div class="flex items-center justify-between gap-2 mb-2"><b class="text-sm">Douleur signalée</b><button data-a="run-pain-clear" data-v="${i}" class="text-xs text-txt-3 underline">Retirer</button></div>
        ${chips('painz:'+i, it.pain.zone, Object.entries(ZONES).map(([k,l]) => [k,l]), 'grid grid-cols-3')}
        <div class="mt-2">${slider('runpain.'+i, it.pain.level, { label:'Intensité', hint:'0 aucune|10 maximale' })}</div>
        ${it.pain.level >= th.r ? `<div class="mt-2 rounded-lg bg-bad/15 text-bad p-2.5 text-sm"><b>Seuil rouge :</b> arrête cet exercice. Si la douleur persiste, demande un avis médical.${!it.stopped ? `<div class="mt-2">${btn('Arrêter l’exercice', 'run-stop', `data-v="${i}"`, 'danger')}</div>` : ''}</div>`
        : it.pain.level >= th.o ? `<div class="mt-2 rounded-lg bg-warn/15 text-warn p-2.5 text-sm"><b>Seuil orange :</b> réduis l’intensité ou arrête. Une douleur faible n’est pas une autorisation à continuer : fie-toi aux critères d’arrêt.</div>` : ''}`
      : `<button data-a="run-pain" data-v="${i}" class="text-sm text-warn font-semibold min-h-[44px]">⚠ Signaler une douleur</button>`}</div>`;
    body += ui.open['cm-'+i] || it.comment ? `<label class="block"><span class="lbl">Note</span><textarea data-run="comment" data-i="${i}" rows="2" class="inp w-full" placeholder="Sensations, réglages…">${esc(it.comment)}</textarea></label>` : `<button data-a="toggle" data-v="cm-${i}" class="text-sm text-txt-3">+ Ajouter une note</button>`;
    body += `<div class="flex flex-wrap gap-2">${i < a.items.length - 1 ? btn('Exercice suivant →', 'run-cur', `data-v="${i+1}"`, complete ? 'good' : 'ghost') : ''}${!it.stopped && !complete ? btn('Arrêter cet exercice', 'run-stop', `data-v="${i}"`, 'ghost') : ''}${it.stopped ? `<span class="chip bg-bad/15 text-bad">Exercice arrêté</span>` : ''}</div>`;
  }
  return `<article class="card overflow-hidden border-blue/50">${head}<div class="px-4 pb-4 space-y-3">
    <details class="text-sm"><summary class="text-blue">Consignes, critères de réussite et d’arrêt ▾</summary><div class="mt-2 space-y-2 text-txt-2">
      <ul>${ex.cues.map(c => `<li>• ${c}</li>`).join('')}</ul><div class="text-good text-xs font-semibold mt-1">Réussite</div><ul>${ex.ok.map(c => `<li>• ${c}</li>`).join('')}</ul>
      <div class="text-bad text-xs font-semibold mt-1">Arrêt</div><ul>${ex.stop.map(c => `<li>• ${c}</li>`).join('')}</ul><pre class="schema">${esc(ex.schema)}</pre></div></details>
    ${body}</div></article>`;
}
function setRow(ex, it, i, s, k) {
  const doneCls = s.done ? 'bg-good text-ink-0 border-good' : 'bg-ink-2 border-ink-3 text-txt-2';
  if (ex.kind === 'strength' || ex.kind === 'time') {
    const unitR = ex.kind === 'time' ? 's' : 'rép.';
    return `<div class="flex items-center gap-2 ${s.done ? 'opacity-80' : ''}"><span class="w-8 text-xs text-txt-3">S${k+1}</span>
      <div class="flex items-center gap-1 flex-1">${stepper(i, k, 'reps', s.reps, unitR)}${ex.kind === 'strength' && !ex.repsProg ? stepper(i, k, 'load', s.load, 'kg') : ''}</div>
      <button data-a="set-done" data-i="${i}" data-k="${k}" class="w-12 h-12 shrink-0 rounded-xl border-2 text-lg font-bold ${doneCls}" aria-label="Valider la série ${k+1}">✓</button></div>`;
  }
  const label = ex.kind === 'ladder' ? `Bloc ${k+1}/${it.sets.length}` : ex.kind === 'level' ? it.pres.drills[k] : 'Réalisé';
  return `<button data-a="set-done" data-i="${i}" data-k="${k}" class="w-full flex items-center gap-3 rounded-xl border p-3 text-left text-sm ${s.done ? 'border-good/50 bg-good/10' : 'border-ink-3 bg-ink-2'}">
    <span class="w-7 h-7 shrink-0 rounded-lg grid place-items-center font-bold ${s.done ? 'bg-good text-ink-0' : 'bg-ink-3'}">${s.done ? '✓' : ''}</span><span>${esc(label)}</span></button>`;
}
function stepper(i, k, f, v, unit) {
  return `<div class="flex items-center rounded-xl bg-ink-2 border border-ink-3 flex-1 min-w-0">
    <button data-a="set-step" data-i="${i}" data-k="${k}" data-f="${f}" data-d="-1" class="w-10 h-12 text-lg text-txt-2" aria-label="Moins">−</button>
    <input type="number" inputmode="decimal" step="any" data-set="${f}" data-i="${i}" data-k="${k}" value="${v ?? ''}" class="w-full min-w-0 bg-transparent text-center font-semibold h-12" aria-label="${unit}">
    <span class="text-[10px] text-txt-3 -ml-1 mr-1">${unit}</span>
    <button data-a="set-step" data-i="${i}" data-k="${k}" data-f="${f}" data-d="1" class="w-10 h-12 text-lg text-txt-2" aria-label="Plus">+</button></div>`;
}
function runSummary(a) {
  let tonnage = 0, full = 0, part = 0, none = 0;
  a.items.forEach(it => {
    const ex = EX[it.id], nd = it.sets.filter(s => s.done).length;
    if (nd === it.sets.length && !it.stopped) full++; else if (nd) part++; else none++;
    if (ex.kind === 'strength' && !ex.repsProg) it.sets.forEach(s => { if (s.done) tonnage += (+s.load||0) * (+s.reps||0); });
  });
  return { tonnage: Math.round(tonnage), full, part, none, complete: none === 0 && part === 0 };
}
function vBilan(a) {
  const p = parseSlot(a.slot), sm = runSummary(a), b = a.bilan;
  const dur = b.durMin ?? Math.max(1, Math.round(runElapsed(a) / 60000));
  const painItems = a.items.filter(it => it.pain);
  return `<div class="fixed inset-0 z-50 bg-ink-0 overflow-y-auto fade-in"><main class="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-4 safe-t">
    <div><div class="text-xs uppercase tracking-widest text-txt-3">Bilan de séance · S${p.w}</div><h1 class="font-display text-3xl font-bold">${SESSIONS[p.key].icon} ${SESSIONS[p.key].name}</h1>
      <div class="mt-2">${sm.complete ? statusChip('done') : statusChip('incomplete')} ${!sm.complete ? '<span class="text-xs text-txt-3 ml-1">La séance restera identifiée comme incomplète.</span>' : ''}</div></div>
    <div class="grid grid-cols-3 gap-2">
      <div class="card p-3"><div class="text-xs text-txt-3">Durée totale</div><div class="flex items-baseline gap-1"><input type="number" data-bil="durMin" value="${dur}" class="w-16 bg-transparent font-display text-3xl font-bold" aria-label="Durée en minutes"><span class="text-sm text-txt-3">min</span></div></div>
      <div class="card p-3"><div class="text-xs text-txt-3">Exercices réalisés</div><div class="font-display text-3xl font-bold">${sm.full}<span class="text-txt-3 text-lg">/${a.items.length}</span></div><div class="text-[11px] text-txt-3">${sm.part} partiel(s) · ${sm.none} non fait(s)</div></div>
      <div class="card p-3"><div class="text-xs text-txt-3">Charge totale soulevée</div><div class="font-display text-3xl font-bold">${sm.tonnage}<span class="text-txt-3 text-lg"> kg</span></div></div>
    </div>
    ${card(`<div class="lbl">RPE global de la séance</div>${chips('bil:rpe', b.rpe, rpeOpts(), 'grid grid-cols-5')}
      ${b.rpe ? `<p class="text-sm text-txt-2 mt-2">Charge de séance : ${dur} min × RPE ${b.rpe} = <b class="text-txt-1">${dur * b.rpe} UA</b></p>` : ''}`)}
    ${card(`<div class="lbl">Sensations musculaires</div>${chips('bil:sens', b.sens, [['fraiches','Fraîches','good'],['normales','Normales','good'],['lourdes','Lourdes','warn'],['courbatures','Courbatures','warn'],['tensions','Tensions localisées','bad']])}`)}
    ${card(`<div class="lbl">Douleurs à froid (0-10)</div><div class="space-y-3">${Object.entries(ZONES).map(([z, l]) => slider('bil.'+z, b.pains[z], { label:l, hint:'0 aucune|10 maximale' })).join('')}</div>
      ${painItems.length ? `<div class="mt-3 text-xs text-txt-3">Signalées pendant la séance : ${painItems.map(it => `${EX[it.id].n} (${ZONES[it.pain.zone]} ${it.pain.level}/10)`).join(' · ')}</div>` : ''}`)}
    ${card(`<label class="block"><span class="lbl">Commentaires</span><textarea data-bil="comment" rows="3" class="inp w-full" placeholder="Ce qui a marché, ce qui a gêné…">${esc(b.comment)}</textarea></label>`)}
    <p class="text-xs text-txt-3">Après l’enregistrement, renseigne tes sensations demain (24 h) et après-demain (48 h) : elles conditionnent toute proposition de progression.</p>
  </main><footer class="fixed bottom-0 inset-x-0 bg-ink-1/95 backdrop-blur border-t border-ink-3 safe-b"><div class="max-w-2xl mx-auto px-4 py-3 flex gap-2">
    ${btn('← Retour à la séance', 'bil-back', '', 'ghost')}<div class="flex-1"></div>${btn('Enregistrer', 'bil-save', b.rpe ? '' : 'disabled', 'good')}</div></footer></div>`;
}
function saveRun() {
  const a = DB().active, p = parseSlot(a.slot), sm = runSummary(a), b = a.bilan;
  const durMin = +(b.durMin ?? Math.max(1, Math.round(runElapsed(a)/60000)));
  const ex = {};
  a.items.forEach(it => { ex[it.id] = { pres: it.pres, sets: it.sets, rpe: it.rpe, tech: it.tech, pain: it.pain, comment: it.comment, stopped: it.stopped, km: it.km === '' ? null : +it.km, min: it.min == null || it.min === '' ? null : +it.min, swapped: it.swapped, adapted: it.adapted, touched: !it.swapped && (it.sets.some(s => s.done) || it.rpe != null) }; });
  const log = { id: uid(), slot: a.slot, w: p.w, key: p.key, phase: weekInfo(p.w).phase, date: a.date, start: a.startedAt, end: Date.now(), durMin, status: sm.complete ? 'done' : 'incomplete',
    rpe: b.rpe, sens: b.sens, pains: b.pains, comment: b.comment, tonnage: sm.tonnage, ex, _u: Date.now() };
  DB().logs.push(log); DB().active = null; ui.runOpen = false;
  persist('s_' + log.id, 'active');
  return log;
}

/* Détail d'une séance enregistrée */
function logModal(id) {
  const l = DB().logs.find(x => x.id === id); if (!l) return '';
  return `<div class="space-y-3"><div><div class="text-xs text-txt-3">${fmtLong(l.date)} · S${l.w}</div><h3 class="font-display text-2xl font-bold">${SESSIONS[l.key].icon} ${SESSIONS[l.key].name}</h3><div class="mt-1">${statusChip(l.status)}</div></div>
    <div class="grid grid-cols-4 gap-2 text-center">${[['Durée', l.durMin+' min'],['RPE', l.rpe ?? '—'],['Charge', logLoad(l)+' UA'],['Soulevé', l.tonnage+' kg']].map(([k,v]) => `<div class="rounded-xl bg-ink-2 p-2"><div class="text-[11px] text-txt-3">${k}</div><b>${v}</b></div>`).join('')}</div>
    <ul class="divide-y divide-ink-3">${Object.entries(l.ex).map(([eid, x]) => { const e = EX[eid]; if (!e) return ''; const ds = (x.sets||[]).filter(s => s.done);
      return `<li class="py-2 text-sm"><div class="flex justify-between gap-2"><b>${x.swapped ? esc(x.swapped) : e.n}</b><span class="text-xs text-txt-3">${ds.length}/${(x.sets||[]).length}${x.stopped ? ' · arrêté' : ''}</span></div>
        <div class="text-xs text-txt-3">${e.kind === 'strength' && !e.repsProg ? ds.map(s => `${s.reps}×${s.load}`).join(' · ') + ' kg' : e.kind === 'strength' || e.kind === 'time' ? ds.map(s => s.reps).join(' · ') + (e.kind === 'time' ? ' s' : ' rép.') : esc(x.pres && x.pres.text || '')}${x.km ? ` · ${x.km} km` : ''}${x.rpe ? ` · RPE ${x.rpe}` : ''}${x.tech ? ` · technique ${['','propre','correcte','dégradée'][x.tech]}` : ''}${x.pain ? ` · <span class="text-warn">douleur ${ZONES[x.pain.zone]} ${x.pain.level}/10</span>` : ''}</div>
        ${x.comment ? `<div class="text-xs italic text-txt-2">« ${esc(x.comment)} »</div>` : ''}</li>`; }).join('')}</ul>
    ${l.sens ? `<div class="text-sm">Sensations : <b>${l.sens}</b></div>` : ''}
    <div class="text-sm">Douleurs à froid : ${Object.entries(ZONES).map(([z, n]) => `${n} ${l.pains && l.pains[z] != null ? l.pains[z] : '—'}`).join(' · ')}</div>
    ${l.comment ? `<p class="text-sm italic text-txt-2">« ${esc(l.comment)} »</p>` : ''}
    <div class="flex justify-end">${btn('Supprimer cette séance', 'log-del', `data-v="${l.id}"`, 'danger')}</div></div>`;
}
