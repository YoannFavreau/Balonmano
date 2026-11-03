/* =====================================================================
   SYNCHRONISATION GITHUB (dépôt privé de données)
   - Les données vivent dans un fichier JSON d'un dépôt privé, séparé du code :
     une mise à jour de l'app ne peut pas les toucher.
   - Chaque appareil garde une copie locale (hors ligne) et fusionne à chaque
     synchronisation : rien n'est écrasé, les ajouts des deux appareils sont conservés.
   - Chaque enregistrement est un commit : l'historique du dépôt sert de sauvegarde.
   ===================================================================== */
const GH_KEY = 'hb-github';
const GH = {
  cfg: null, sha: null, timer: null, busy: false, again: false, last: 0, err: '',
  load() { try { this.cfg = JSON.parse(localStorage.getItem(GH_KEY)) || null; } catch (e) { this.cfg = null; } return this.cfg; },
  save(c) { this.cfg = c; try { c ? localStorage.setItem(GH_KEY, JSON.stringify(c)) : localStorage.removeItem(GH_KEY); } catch (e) {} },
  on() { return !!(this.cfg && this.cfg.token && this.cfg.owner && this.cfg.repo); },
  url() { const c = this.cfg; return `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${c.path || 'carnet.json'}`; },
  headers() { return { 'Authorization': 'Bearer ' + this.cfg.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; }
};
const b64enc = s => { const bytes = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

function snapshot() { return { app:'carnet-handball', v:2, savedAt: Date.now(), state: REAL.state, logs: REAL.logs, checkins: REAL.checkins, active: REAL.active, activeU: REAL.activeU || 0 }; }

/* Fusion sans perte : union des séances / suivis / événements, dernier écrit gagne pour les réglages */
function mergeData(L, R) {
  if (!R || !R.state) return clone(L);
  if (!L || !L.state) return clone(R);
  const resetAt = Math.max(L.state.resetAt || 0, R.state.resetAt || 0);
  const newer = (L.state.updatedAt || 0) >= (R.state.updatedAt || 0) ? L : R, older = newer === L ? R : L;
  const tomb = { logs:{}, events:{} };
  [L, R].forEach(x => ['logs','events'].forEach(k => Object.entries((x.state.tomb || {})[k] || {}).forEach(([id, t]) => tomb[k][id] = Math.max(tomb[k][id] || 0, t))));
  const state = migrate(clone(newer.state)); state.tomb = tomb; state.resetAt = resetAt;
  const evs = {}; [...(older.state.events || []), ...(newer.state.events || [])].forEach(e => { evs[e.id] = e; });
  state.events = Object.values(evs).filter(e => !tomb.events[e.id] && (e._c || Infinity) >= resetAt);
  const dec = {}; [...(older.state.decisions || []), ...(newer.state.decisions || [])].forEach(d => { dec[d.key] = d; }); state.decisions = Object.values(dec);
  const logs = {}; [...(L.logs || []), ...(R.logs || [])].forEach(l => { const cur = logs[l.id]; if (!cur || (l._u || l.end || 0) > (cur._u || cur.end || 0)) logs[l.id] = l; });
  const outLogs = Object.values(logs).filter(l => !tomb.logs[l.id] && (l.end || 0) >= resetAt);
  const checkins = {}; [L.checkins || {}, R.checkins || {}].forEach(cs => Object.entries(cs).forEach(([d, c]) => { const cur = checkins[d]; if ((c._u || 0) >= resetAt && (!cur || (c._u || 0) > (cur._u || 0))) checkins[d] = c; }));
  const act = (L.activeU || 0) >= (R.activeU || 0) ? L : R;
  return clone({ app:'carnet-handball', v:2, state, logs: outLogs, checkins, active: act.active || null, activeU: act.activeU || 0 });
}
const canon = d => JSON.stringify({ s: d.state, l: [...(d.logs||[])].sort((a,b) => a.id < b.id ? -1 : 1), c: d.checkins, a: d.active, u: d.activeU });

async function ghFetch() {
  const r = await fetch(GH.url() + '?ref=' + encodeURIComponent(GH.cfg.branch || 'main') + '&t=' + Date.now(), { headers: GH.headers(), cache:'no-store' });
  if (r.status === 404) return { exists:false };
  if (!r.ok) throw new Error(r.status === 401 ? 'Jeton refusé (401) : vérifie-le ou recrée-le' : r.status === 403 ? 'Accès refusé (403) : le jeton doit avoir « Contents : Read and write » sur ce dépôt' : 'GitHub a répondu ' + r.status);
  const j = await r.json();
  if (!j.content && j.size > 0) { // fichier > 1 Mo : lecture brute
    const raw = await fetch(GH.url() + '?ref=' + encodeURIComponent(GH.cfg.branch || 'main'), { headers: { ...GH.headers(), Accept:'application/vnd.github.raw+json' }, cache:'no-store' });
    return { exists:true, sha:j.sha, data: await raw.json() };
  }
  return { exists:true, sha:j.sha, data: JSON.parse(b64dec(j.content || '') || '{}') };
}
async function ghPut(data, sha) {
  const dev = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'ordinateur';
  const r = await fetch(GH.url(), { method:'PUT', headers: { ...GH.headers(), 'Content-Type':'application/json' },
    body: JSON.stringify({ message: `Sauvegarde ${new Date().toLocaleString('fr-FR')} (${dev})`, content: b64enc(JSON.stringify(data, null, 1)), branch: GH.cfg.branch || 'main', ...(sha ? { sha } : {}) }) });
  if (r.status === 409 || r.status === 422) return { conflict:true };
  if (!r.ok) throw new Error('Écriture refusée par GitHub (' + r.status + ')');
  const j = await r.json(); return { sha: j.content.sha };
}
async function ghSync(reason) {
  if (!GH.on() || DEMO) return;
  if (GH.busy) { GH.again = true; return; }
  if (!navigator.onLine) { setSync('offline'); return; }
  GH.busy = true; setSync('saving');
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const remote = await ghFetch();
      const local = snapshot();
      if (GH.cfg.first && remote.exists) local.state = { ...local.state, updatedAt: 0 }; // nouvel appareil : les réglages du dépôt priment
      const merged = mergeData(local, remote.exists ? remote.data : null);
      const changedLocal = canon(merged) !== canon(local);
      if (changedLocal) { REAL.state = merged.state; REAL.logs = merged.logs; REAL.checkins = merged.checkins; REAL.active = merged.active; REAL.activeU = merged.activeU; saveLocal(); }
      if (!remote.exists || canon(merged) !== canon(remote.data)) {
        const res = await ghPut({ ...merged, savedAt: Date.now() }, remote.exists ? remote.sha : null);
        if (res.conflict) continue;
      }
      GH.last = Date.now(); GH.err = ''; if (GH.cfg.first) { GH.cfg.first = false; GH.save(GH.cfg); }
      if (changedLocal && !(DB().active && ui.runOpen) && !ui.wiz) render();
      break;
    }
    setSync('ok');
  } catch (e) { GH.err = e.message || String(e); setSync(navigator.onLine ? 'error' : 'offline'); }
  GH.busy = false;
  if (GH.again) { GH.again = false; setTimeout(() => ghSync('again'), 500); }
}
function ghSchedule() { if (!GH.on() || DEMO) return; clearTimeout(GH.timer); GH.timer = setTimeout(() => ghSync('change'), 4000); setSync('saving'); }

GH.load();
if (GH.on()) {
  Sync.mode = 'github';
  window.addEventListener('online', () => ghSync('online'));
  window.addEventListener('offline', () => setSync('offline'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ghSync('focus'); else if (GH.timer) { clearTimeout(GH.timer); ghSync('hide'); } });
  setInterval(() => { if (document.visibilityState === 'visible') ghSync('poll'); }, 90000);
}

/* Écran de réglage */
function syncPanel() {
  const c = GH.cfg || { owner:'', repo:'carnet-handball-data', path:'carnet.json', branch:'main', token:'' };
  const st = GH.on() ? (GH.err ? `<span class="text-warn">⚠ ${esc(GH.err)}</span>` : GH.last ? `<span class="text-good">✓ Synchronisé à ${new Date(GH.last).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</span>` : 'Connexion en cours…') : '<span class="text-txt-3">Non configurée sur cet appareil</span>';
  const inClaude = !!(window.claude && window.claude.use) && !GH.on();
  return card(`${h2('Synchronisation téléphone ↔ ordinateur', GH.on() ? '<span class="chip bg-good/15 text-good">GitHub</span>' : '')}
    <p class="text-sm">${st}</p>
    ${inClaude ? `<p class="text-xs text-txt-3 mt-2">Dans claude.ai, la synchronisation se fait déjà avec ton compte Claude. La configuration GitHub ci-dessous sert pour la version installée depuis GitHub Pages.</p>` : ''}
    <div class="grid sm:grid-cols-2 gap-3 mt-4">
      <label><span class="lbl">Ton pseudo GitHub</span><input id="gh-owner" value="${esc(c.owner)}" class="inp w-full" placeholder="ex. yfavreau" autocapitalize="off" autocorrect="off"></label>
      <label><span class="lbl">Dépôt privé des données</span><input id="gh-repo" value="${esc(c.repo)}" class="inp w-full" autocapitalize="off"></label>
      <label class="sm:col-span-2"><span class="lbl">Jeton d’accès (fine-grained)</span><input id="gh-token" type="password" value="${esc(c.token)}" class="inp w-full font-mono" placeholder="github_pat_…" autocomplete="off"></label>
    </div>
    <div class="flex flex-wrap gap-2 mt-3">${btn(GH.on() ? 'Enregistrer et synchroniser' : 'Activer la synchronisation', 'gh-save')}${GH.on() ? btn('Synchroniser maintenant', 'gh-now', '', 'ghost') + btn('Déconnecter cet appareil', 'gh-off', '', 'danger') : ''}</div>
    <p class="text-xs text-txt-3 mt-3">Le jeton reste uniquement sur cet appareil (jamais dans les données synchronisées). Tes données locales sont fusionnées avec celles du dépôt : rien n’est écrasé.</p>
    <details class="mt-4"><summary class="text-sm text-blue">Comment créer le dépôt et le jeton (5 min, une seule fois) ▾</summary><ol class="text-sm text-txt-2 mt-2 space-y-2 list-decimal pl-5">
      <li>Sur github.com : <b>New repository</b> → nom <code>carnet-handball-data</code> → <b>Private</b> → coche « Add a README » → Create.</li>
      <li>Photo de profil → <b>Settings</b> → <b>Developer settings</b> → <b>Personal access tokens</b> → <b>Fine-grained tokens</b> → <b>Generate new token</b>.</li>
      <li>Nom : « Carnet handball » · Expiration : 1 an · <b>Repository access</b> : <i>Only select repositories</i> → <code>carnet-handball-data</code>.</li>
      <li><b>Permissions</b> → Repository permissions → <b>Contents : Read and write</b> (rien d’autre). Generate, puis copie le jeton.</li>
      <li>Colle-le ici avec ton pseudo, puis « Activer ». Refais l’étape 5 sur ton autre appareil (même jeton).</li></ol>
      <p class="text-xs text-txt-3 mt-2">Si un appareil est perdu : supprime le jeton sur GitHub et crée-en un nouveau. L’historique des commits du dépôt de données te permet de revenir à n’importe quelle sauvegarde.</p></details>`);
}
