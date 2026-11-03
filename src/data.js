/* =====================================================================
   DONNÉES DE RÉFÉRENCE — phases, bibliothèque d'exercices, programme
   ===================================================================== */
const PHASES = [
  { n:1, name:'Reconstruction physique', short:'Reconstruction',
    goal:"Reconstruire une base de force générale et spécifique (mollets, épaule), développer le cardio en fractionné court et long, installer proprioception et petits appuis contrôlés.",
    focus:['Renforcement général','Force membres inférieurs','Mollets spécifiques','Cardio : fractionné court & long','Proprioception','Petits appuis contrôlés','Épaule'] },
  { n:2, name:'Préparation au retour collectif', short:'Retour collectif',
    goal:"Monter la force, développer la capacité intermittente, travailler les appuis multidirectionnels, la réactivité, les accélérations et les freinages contrôlés. Se termine par l'évaluation fonctionnelle avant reprise collective.",
    focus:['Progression de la force','Capacité intermittente','Appuis multidirectionnels','Réactivité','Accélérations progressives','Freinages contrôlés','Stabilité dynamique'] },
  { n:3, name:'Réintégration spécifique handball', short:'Réintégration',
    goal:"S'adapter progressivement aux entraînements collectifs, qui remplacent une partie des séances personnelles. Force en maintien, explosivité, déplacements défensifs, répétition des efforts, spécifique ailier.",
    focus:['Adaptation au collectif','Force en maintien','Explosivité','Déplacements défensifs','Changements de direction','Répétition des efforts','Spécifique ailier'] },
  { n:4, name:'Retour à la performance', short:'Performance',
    goal:"Force et puissance, accélérations/décélérations, agilité spécifique, efforts répétés, tolérance à la charge collective complète. Prévention maintenue, bilan final.",
    focus:['Force & puissance','Accélérations / décélérations','Agilité spécifique','Efforts répétés','Charge collective','Prévention','Bilan final'] }
];

const SESSIONS = {
  A:{ key:'A', name:'Force bas du corps', short:'Force bas', icon:'🏋️', calf:true },
  B:{ key:'B', name:'Fractionné court', short:'Fract. court', icon:'⚡', calf:true },
  C:{ key:'C', name:'Haut du corps & stabilité', short:'Haut du corps', icon:'💪', calf:false },
  D:{ key:'D', name:'Fractionné long & athlétique', short:'Fract. long', icon:'🏃', calf:true }
};

const ZONES = { calfL:'Mollet gauche', calfR:'Mollet droit', shoulder:'Épaule droite' };

/* ---------- Échelles de fractionné (paliers) ---------- */
const LADDERS = {
  court: [
    { f:'2 × (8 × 15″/45″)', reps:16, w:15, r:45, pct:100, blocks:2, km:2.0, min:16 },
    { f:'2 × (10 × 15″/45″)', reps:20, w:15, r:45, pct:100, blocks:2, km:2.4, min:20 },
    { f:'2 × (8 × 20″/40″)', reps:16, w:20, r:40, pct:100, blocks:2, km:2.4, min:16 },
    { f:'2 × (10 × 20″/40″)', reps:20, w:20, r:40, pct:100, blocks:2, km:2.9, min:20 },
    { f:'2 × (8 × 20″/30″)', reps:16, w:20, r:30, pct:100, blocks:2, km:2.6, min:14 },
    { f:'2 × (10 × 20″/30″)', reps:20, w:20, r:30, pct:100, blocks:2, km:3.1, min:17 },
    { f:'3 × (8 × 15″/15″)', reps:24, w:15, r:15, pct:105, blocks:3, km:3.2, min:13 },
    { f:'3 × (10 × 15″/15″)', reps:30, w:15, r:15, pct:105, blocks:3, km:3.9, min:16 },
    { f:'RSA : 3 × (6 × 20 m navette, 20″ récup)', reps:18, w:0, r:20, pct:0, blocks:3, km:1.0, min:12, rsa:true },
    { f:'RSA handball : 3 × (8 × aller-retour 20 m, 15″ récup)', reps:24, w:0, r:15, pct:0, blocks:3, km:1.5, min:14, rsa:true }
  ],
  long: [
    { f:'3 × 6′ allure seuil (RPE 7), récup 2′', reps:3, w:360, r:120, pct:85, blocks:3, km:4.5, min:18 },
    { f:'4 × 6′ allure seuil, récup 2′', reps:4, w:360, r:120, pct:85, blocks:4, km:6.0, min:24 },
    { f:'3 × 8′ allure seuil, récup 2′', reps:3, w:480, r:120, pct:85, blocks:3, km:6.0, min:24 },
    { f:'5 × 1000 m (≈ 90 % VMA), récup 1′30', reps:5, w:0, r:90, pct:90, blocks:5, km:5.0, min:22 },
    { f:'4 × 4′ (≈ 92 % VMA), récup 3′', reps:4, w:240, r:180, pct:92, blocks:4, km:4.3, min:16 },
    { f:'6 × 3′ (≈ 95 % VMA), récup 2′', reps:6, w:180, r:120, pct:95, blocks:6, km:5.0, min:18 },
    { f:'2 × (6 × 1′/1′) intermittent long', reps:12, w:60, r:60, pct:100, blocks:2, km:3.5, min:12 },
    { f:'3 × (5 × 1′30″/1′) à 95 % VMA', reps:15, w:90, r:60, pct:95, blocks:3, km:5.5, min:22 }
  ]
};
function ladderTarget(step, vma) {
  if (!vma || step.rsa || !step.pct) return '';
  const ms = vma / 3.6 * step.pct / 100;
  if (step.w && step.w <= 60) return `≈ ${Math.round(ms * step.w)} m par effort de ${step.w}″ (${step.pct} % de ta VMA ${vma} km/h)`;
  const pace = 3600 / (vma * step.pct / 100); // s/km
  return `allure cible ≈ ${Math.floor(pace/60)}′${String(Math.round(pace%60)).padStart(2,'0')}″/km (${step.pct} % VMA)`;
}

/* ---------- Familles proprioception / petits appuis / agilité ---------- */
const LEVEL_NAMES = ['Contrôle','Coordination','Vitesse','Réactivité','Spécificité handball'];
const FAMILIES = {
  proprio: { name:'Proprioception', icon:'🦶', zone:'calf', levels:[
    { drills:['Équilibre unipodal yeux ouverts, sol stable — 3 × 30 s / jambe','Unipodal + mouvements de bras et de tête — 2 × 30 s / jambe'], load:1 },
    { drills:['Unipodal sur coussin instable — 3 × 30 s / jambe','Y-balance (atteintes avant / postéro-médiale / postéro-latérale) — 2 × 3 / jambe'], load:1 },
    { drills:['Perturbations contrôlées (partenaire / élastique) — 3 × 20 s / jambe','Petit saut sur place → réception unipodale stabilisée 2 s — 3 × 5 / jambe'], load:2 },
    { drills:['Saut latéral → réception unipodale stabilisée — 3 × 5 / côté','Réception de ballon en unipodal sur coussin — 3 × 30 s'], load:3 },
    { drills:['Réception type tir en suspension + stabilisation — 3 × 5 / jambe','Duel d’équilibre au contact (épaule contre épaule) — 4 × 15 s'], load:3 } ] },
  appuis: { name:'Petits appuis', icon:'👟', zone:'calf', levels:[
    { drills:['Échelle de rythme en marche rapide (in-in-out-out) — 4 passages','Pas chassés lents — 4 × 10 m'], load:1 },
    { drills:['Échelle en course : 1 pied/case, 2 pieds/case, latéral — 6 passages','Appuis avant/arrière — 4 × 10 s'], load:2 },
    { drills:['Fast feet (pas rapides sur place) — 5 × 8 s','Pas chassés + croisés vite — 6 × 10 m'], load:2 },
    { drills:['Fast feet + départ sur signal sonore — 6 ×','Échelle + sortie réactive à gauche/droite — 6 ×'], load:3 },
    { drills:['Déplacements défensifs handball (pas glissés, sortie sur porteur, repli) — 6 × 15 s','Montée défensive + retour aile — 6 ×'], load:3 } ] },
  agilite: { name:'Agilité', icon:'🔀', zone:'calf', levels:[
    { drills:['Freinage en 3 appuis depuis course à 50 % — 6 ×','Slalom entre plots lent, appuis courts — 4 ×'], load:1 },
    { drills:['Slalom plots à 60-70 % — 6 ×','Changements de direction 45° à 70 % — 3 × 4 / côté'], load:2 },
    { drills:['5-0-5 (demi-tour 180°) à 80 % — 6 ×','Accélération 10 m + freinage contrôlé — 6 ×'], load:3 },
    { drills:['Départs sur signal visuel — 8 ×','Changement de direction réactif (partenaire indique le côté) — 8 ×'], load:3 },
    { drills:['Repli défensif → contre-attaque ailier → réception de passe en course — 6 ×','Feinte + débordement en 1 c 1 sur l’aile — 6 ×'], load:3 } ] }
};
const FAMILY_MAX = { proprio:{1:3,2:4,3:5,4:5}, appuis:{1:2,2:4,3:5,4:5}, agilite:{1:2,2:4,3:5,4:5} };

/* ---------- Bibliothèque d'exercices ----------
 zone : 'calf' | 'shoulder' | null   (liés aux blessures → règles spécifiques)
 kind : 'strength' | 'time' | 'ladder' | 'level' | 'check'
 alt  : alternative possible en vigilance orange (jamais automatique) */
const EX = {
  warmup: { n:'Échauffement', fam:'Course', kind:'check', zone:null,
    obj:'Préparer cœur, tendons et système nerveux à l’effort intense.',
    tech:'10′ de footing progressif, puis gammes : montées de genoux, talons-fesses, pas chassés, foulées bondissantes basses, 3 accélérations progressives sur 60 m. Les mollets doivent être « chauds » avant toute vitesse.',
    mus:'Global, triceps sural, ischio-jambiers, fléchisseurs de hanche',
    cues:['Ne jamais commencer une séance de vitesse à froid','Accélérations progressives : 60 → 80 → 90 %'],
    schema:'footing 10′ ──► gammes 5′ ──► 3 × accélérations\n   ▁▂▃            ▃▄▅               ▅▆▇',
    ok:['Sensation de chaleur dans les mollets','Aucune gêne pendant les accélérations'],
    stop:['Douleur mollet ≥ seuil orange pendant l’échauffement → pas de fractionné'] },
  cooldown: { n:'Retour au calme', fam:'Course', kind:'check', zone:null,
    obj:'Faire redescendre la fréquence cardiaque et noter ses sensations à froid.',
    tech:'5-10′ de trot ou de marche, mobilité douce des chevilles et des hanches, respiration lente (4 s inspiration / 6 s expiration).',
    mus:'—', cues:['Pas d’étirement intense des mollets juste après une séance de vitesse'],
    schema:'trot 5′ ──► mobilité 3′ ──► respiration 2′', ok:['Fréquence cardiaque revenue au calme'], stop:['—'] },

  squat: { n:'Squat barre (ou presse)', fam:'Force', kind:'strength', zone:null, load:50, step:2.5, unit:'kg',
    obj:'Force générale des extenseurs de hanche et de genou : base de l’accélération et de la détente.',
    tech:'Pieds largeur d’épaules, pointes légèrement ouvertes. Descente contrôlée hanches et genoux ensemble, jusqu’à cuisses parallèles au sol (ou amplitude sans douleur). Remontée en poussant le sol. Alternative presse à cuisses si la technique n’est pas maîtrisée.',
    mus:'Quadriceps, grand fessier, adducteurs, érecteurs du rachis',
    cues:['Genoux dans l’axe des 2ᵉ-3ᵉ orteils','Dos neutre, gainage avant la descente','Talons au sol'],
    schema:'   ▬▬O▬▬   barre sur trapèzes\n    /|\\\n   / | \\     dos neutre\n  /  |  \\\n _\\  /\\_/_   genoux dans l’axe des pieds',
    ok:['Toutes les répétitions à amplitude constante','RPE ≤ cible','Pas de valgus des genoux'],
    stop:['Douleur articulaire (genou, dos)','Perte du dos neutre','Douleur mollet ≥ seuil orange'] },
  rdl: { n:'Soulevé de terre roumain', fam:'Force', kind:'strength', zone:null, load:50, step:5, unit:'kg',
    obj:'Chaîne postérieure en excentrique : ischios et fessiers, clés des freinages et des sprints.',
    tech:'Debout, barre en main. Genoux légèrement fléchis et fixes, pousser les hanches vers l’arrière en gardant le dos plat. La barre glisse le long des cuisses jusqu’à mi-tibia ou jusqu’à la limite du dos neutre. Remonter en contractant les fessiers.',
    mus:'Ischio-jambiers, grand fessier, érecteurs',
    cues:['Charnière de hanche, pas un squat','Barre collée aux jambes','Regard au sol, nuque neutre'],
    schema:'   O___\n    \\  ‾‾\\    hanches reculent\n     \\    |\n      |   ▬▬  barre le long des jambes\n     _/   \\_',
    ok:['Étirement ressenti dans les ischios','Dos neutre sur toutes les rép.'],
    stop:['Dos qui s’arrondit','Douleur lombaire'] },
  split: { n:'Fente bulgare haltères', fam:'Force', kind:'strength', zone:null, load:10, step:2, unit:'kg/main',
    obj:'Force unilatérale et contrôle frontal du genou, indispensables aux appuis asymétriques de l’ailier.',
    tech:'Pied arrière posé sur un banc, pied avant à ~70 cm. Descendre verticalement jusqu’à ce que le genou arrière frôle le sol. Buste légèrement penché, genou avant au-dessus du pied. Pousser dans tout le pied avant.',
    mus:'Quadriceps, grand et moyen fessier, adducteurs',
    cues:['Genou avant aligné sur le 2ᵉ orteil','Bassin de face','Commencer par la jambe la plus faible'],
    schema:'        O\n       /|\\\n   ▮  / |  ▮\n     /  |___\n    /       \\___▭ banc\n   ⊥  genou au-dessus du pied',
    ok:['Équilibre stable','Aucun valgus','Écart G/D faible'],
    stop:['Genou qui rentre','Douleur genou ou mollet ≥ seuil orange'] },
  legcurl: { n:'Leg curl (machine)', fam:'Force', kind:'strength', zone:null, load:30, step:2.5, unit:'kg',
    obj:'Renforcer les ischio-jambiers en flexion de genou (prévention des lésions en sprint).',
    tech:'Allongé ou assis selon la machine, axe du genou aligné avec l’axe de la machine. Flexion contrôlée, pause 1 s, retour en 3 s.',
    mus:'Ischio-jambiers (biceps fémoral, semi-tendineux, semi-membraneux), gastrocnémiens',
    cues:['Bassin plaqué','Retour lent (3 s)'], schema:'  ═══O═══╗\n         ║ ⟲ flexion du genou\n         ▮ boudin',
    ok:['Amplitude complète, retour contrôlé'], stop:['Crampe ou douleur à l’arrière de la cuisse'] },
  nordic: { n:'Nordic hamstring (assisté)', fam:'Force', kind:'strength', zone:null, load:0, step:0, unit:'rép.', repsProg:true,
    obj:'Excentrique des ischios : exercice de prévention le plus documenté contre les lésions d’ischios.',
    tech:'À genoux, chevilles bloquées. Corps gainé, se laisser descendre vers l’avant le plus lentement possible, rattraper avec les mains, revenir en poussant. Assistance élastique au début.',
    mus:'Ischio-jambiers (excentrique)', cues:['Hanches tendues','Freiner le plus longtemps possible'],
    schema:'  O\\\n   \\\\   corps gainé\n    \\\\  descente lente\n ____\\|__ genoux sur coussin',
    ok:['Freinage contrôlé sur ≥ 60 % de l’amplitude'], stop:['Crampe','Douleur aiguë à l’arrière de la cuisse'] },
  calf_straight: { n:'Calf raise genou tendu', fam:'Mollets', kind:'strength', zone:'calf', load:20, step:2, unit:'kg', inj:true,
    obj:'Renforcer les gastrocnémiens (zone des déchirures) en amplitude complète et sous charge progressive.',
    tech:'Debout sur une marche, avant-pied en appui, genou tendu sans être verrouillé. Montée en 2 s sur la pointe, pause 1 s, descente en 3 s sous l’horizontale. Unilatéral (haltère) ou bilatéral (machine / Smith). Commencer par le mollet droit.',
    mus:'Gastrocnémiens (jumeaux), soléaire, tendon d’Achille',
    cues:['Amplitude complète, talon sous la marche en bas','Appui sur gros orteil + 2ᵉ orteil (pas sur le bord externe)','Tempo 2-1-3'],
    schema:'  haltère ▮     O\n           \\__/|\\     main libre au mur\n               |\n               |     genou TENDU\n           ┌───┤\n  marche → │ ▲ │ monte 2 s · tient 1 s\n           │ ▼ │ descend 3 s sous l’horizontale\n           └───┘',
    ok:['Toutes les rép. en amplitude complète et au tempo','Écart G/D ≤ 1 rép.','Sensations 24 h et 48 h sans aggravation'],
    stop:['Douleur localisée sur l’ancienne lésion ≥ seuil orange','Perte d’amplitude marquée','Pied qui bascule en supination'] },
  calf_bent: { n:'Soléaire genou fléchi', fam:'Mollets', kind:'strength', zone:'calf', load:30, step:2.5, unit:'kg', inj:true,
    obj:'Isoler le soléaire, qui encaisse la majorité de la charge à chaque appui de course.',
    tech:'Assis, genoux fléchis à 90°, charge sur les cuisses (machine ou barre), avant-pied sur une cale. Montée complète, pause 1 s, descente contrôlée.',
    mus:'Soléaire (gastrocnémiens raccourcis donc peu actifs)',
    cues:['Ne pas rebondir en bas','Monter le plus haut possible'],
    schema:'        ▬▬▬▬  charge sur les cuisses\n       O  │\n      /|\\_│____\n       |  │    |  genou à 90°\n       |__│    |\n          ▲    ▼  talons\n   ▔▔▔▔▔▔▔▔▔▔▔▔▔ cale sous l’avant-pied',
    ok:['Toutes les rép. complètes','Brûlure musculaire, pas de douleur localisée'],
    stop:['Douleur localisée sur l’ancienne lésion ≥ seuil orange'] },
  plank: { n:'Gainage ventral / dead bug', fam:'Gainage', kind:'time', zone:null, load:30, step:5, unit:'s',
    obj:'Stabilité lombo-pelvienne pour transmettre la force entre jambes et bras.',
    tech:'Planche sur les avant-bras, corps aligné, bassin en légère rétroversion, respiration continue. Alternative : dead bug lent.',
    mus:'Transverse, droit de l’abdomen, obliques', cues:['Pas de creux lombaire','Respirer'],
    schema:'   O____________\n   ▔ coudes sous les épaules', ok:['Alignement tenu toute la durée'], stop:['Douleur lombaire'] },
  copenhagen: { n:'Gainage Copenhague (levier court)', fam:'Gainage', kind:'time', zone:null, load:20, step:5, unit:'s',
    obj:'Adducteurs en isométrie : stabilité du bassin dans les appuis latéraux, prévention pubalgie.',
    tech:'Gainage latéral, genou supérieur posé sur un banc, jambe basse libre. Bassin aligné.',
    mus:'Adducteurs, obliques', cues:['Pousser le genou dans le banc'],
    schema:'  genou sur banc ▭▭▭\n             ___/\n     O______/   corps aligné', ok:['Durée tenue des deux côtés'], stop:['Douleur à l’aine'] },
  boxjump: { n:'Box jump (réception basse)', fam:'Puissance', kind:'strength', zone:'calf', impact:true, load:0, step:0, unit:'rép.', repsProg:true,
    obj:'Explosivité en limitant l’impact de réception (on atterrit en hauteur).',
    tech:'Sauter sur une box (40-60 cm) en contre-mouvement rapide, réception silencieuse genoux fléchis, redescendre en marchant (pas en sautant).',
    mus:'Quadriceps, fessiers, triceps sural', cues:['Réception silencieuse','Redescendre à pied'],
    schema:'          ┌────┐\n    O  ↗  │ O  │\n   /|\\    │/|\\ │\n   / \\    │/ \\ │', ok:['Hauteur constante, réception stable'], stop:['Réception bruyante ou genou qui rentre','Douleur mollet'] },
  cmj: { n:'Sauts contre-mouvement (CMJ)', fam:'Puissance', kind:'strength', zone:'calf', impact:true, load:0, step:0, unit:'rép.', repsProg:true,
    obj:'Puissance verticale pour les tirs en suspension.',
    tech:'Flexion rapide puis extension maximale, bras actifs, réception amortie. Récupération complète entre séries.',
    mus:'Extenseurs de hanche, genou, cheville', cues:['Intention maximale à chaque saut','Réception symétrique'],
    schema:'    O ↑\n   /|\\\n   / \\  ⇣ ⇡', ok:['Hauteur maintenue sur toutes les rép.'], stop:['Baisse nette de hauteur','Douleur mollet'] },
  pogo: { n:'Pogo hops (rebonds de cheville)', fam:'Pliométrie', kind:'strength', zone:'calf', impact:true, load:0, step:0, unit:'contacts', repsProg:true,
    obj:'Raideur du complexe mollet-Achille : pont entre course et sauts.',
    tech:'Petits rebonds rapides sur l’avant-pied, genoux quasi tendus, temps de contact le plus court possible.',
    mus:'Triceps sural, tendon d’Achille', cues:['Le talon ne touche jamais','Réceptions silencieuses'],
    schema:'   O    O    O\n  /|\\  /|\\  /|\\\n  / \\  / \\  / \\  contacts courts', ok:['Rythme régulier','Pas d’asymétrie'], stop:['Douleur mollet','Talon qui écrase le sol'] },
  accel: { n:'Accélérations / décélérations', fam:'Course', kind:'strength', zone:'calf', impact:true, load:0, step:0, unit:'rép.', repsProg:true,
    obj:'Réapprendre à accélérer et freiner fort, progressivement.',
    tech:'Départ debout, accélération progressive sur 15-20 m (80 → 95 %), freinage contrôlé en 3-4 appuis, marche retour.',
    mus:'Fessiers, ischios, quadriceps, triceps sural', cues:['Buste penché au départ','Freinage bassin bas'],
    schema:'  O→ → → →  ■ ■ ■  freinage en 3-4 appuis\n  0 m      20 m', ok:['Vitesse maîtrisée, freinage propre'], stop:['Tiraillement mollet ou ischio'] },

  row: { n:'Tirage horizontal (rowing haltère / poulie)', fam:'Haut du corps', kind:'strength', zone:'shoulder', load:22, step:2, unit:'kg',
    obj:'Rééquilibrer la chaîne postérieure de l’épaule (rétraction scapulaire).',
    tech:'Buste incliné et gainé. Démarrer par le recul de l’omoplate, puis tirer le coude vers la hanche. Pause 1 s, retour contrôlé.',
    mus:'Grand dorsal, rhomboïdes, trapèze moyen, deltoïde postérieur',
    cues:['Omoplate d’abord, coude ensuite','L’épaule ne roule pas vers l’avant en haut'],
    schema:'   O___________  buste gainé\n    \\          ▭ appui banc\n     │▲\n     ▮▼ coude vers la hanche', ok:['Rép. contrôlées, pause 1 s'], stop:['Douleur antérieure de l’épaule'] },
  bench: { n:'Développé haltères prise neutre (amplitude contrôlée)', fam:'Haut du corps', kind:'strength', zone:'shoulder', load:18, step:2, unit:'kg/main',
    obj:'Poussée horizontale adaptée à une épaule instable.',
    tech:'Prise neutre (paumes face à face), coudes à ~45° du tronc. Descente jusqu’à ce que les coudes soient au niveau du banc, pas en dessous, pour protéger la capsule antérieure.',
    mus:'Pectoraux, triceps, deltoïde antérieur', cues:['Omoplates serrées et basses','Coudes jamais sous le banc'],
    schema:'      ▮      ▮   paumes face à face\n       \\    /    coudes ≈ 45°\n    ════O════   banc', ok:['Aucune appréhension en bas de mouvement'], stop:['Sensation d’instabilité','Douleur antérieure'] },
  landmine: { n:'Landmine press unilatéral (demi-genou)', fam:'Haut du corps', kind:'strength', zone:'shoulder', load:15, step:2.5, unit:'kg',
    obj:'Poussée diagonale vers le haut : pont vers les gestes au-dessus de la tête.',
    tech:'Demi-genou, barre ancrée au sol. Pousser en diagonale haut/avant en laissant l’omoplate monter en fin de poussée.',
    mus:'Deltoïde, dentelé antérieur, triceps, tronc', cues:['Fessier contracté côté genou au sol','Pas de cambrure'],
    schema:'            ╱ barre ancrée\n      O──▮╱\n     /|      poussée diagonale\n    _| \\_  demi-genou', ok:['Rép. fluides sans douleur'], stop:['Douleur ou appréhension'] },
  pulldown: { n:'Tirage vertical prise neutre', fam:'Haut du corps', kind:'strength', zone:'shoulder', load:45, step:2.5, unit:'kg',
    obj:'Grand dorsal et abaisseurs de l’omoplate, sans position extrême de l’épaule.',
    tech:'Prise neutre, abaisser d’abord les omoplates puis tirer jusqu’au haut du sternum. Ne pas aller derrière la nuque.',
    mus:'Grand dorsal, grand rond, trapèze inférieur, biceps', cues:['Épaules basses','Poitrine vers la barre'],
    schema:'   ═╤═══╤═\n    \\ O /   tirer vers le sternum\n     /|\\\n    ▭▭▭▭  siège', ok:['Contrôle complet'], stop:['Douleur en position haute'] },
  facepull: { n:'Face pull à la corde', fam:'Haut du corps', kind:'strength', zone:'shoulder', load:15, step:2.5, unit:'kg',
    obj:'Deltoïde postérieur, trapèze moyen et rotateurs externes : posture et équilibre de l’épaule.',
    tech:'Poulie haute, tirer la corde vers le front coudes hauts, finir en rotation externe (pouces vers l’arrière).',
    mus:'Deltoïde postérieur, infra-épineux, trapèzes', cues:['Pas de haussement d’épaules','Pause 1 s en fin de mouvement'],
    schema:'  poulie ●══════ corde ══╗\n                         O  mains au niveau des oreilles', ok:['Position finale tenue 1 s'], stop:['Douleur'] },
  er: { n:'Rotation externe élastique, coude au corps', fam:'Prévention épaule', kind:'strength', zone:'shoulder', load:0, step:0, unit:'rép.', repsProg:true, inj:true,
    obj:'Rotateurs externes : ils freinent le bras en fin de tir et stabilisent la tête humérale.',
    tech:'Serviette roulée sous le coude, avant-bras horizontal. Rotation vers l’extérieur en 2 s, pause 1 s, retour en 3 s. À la répétition maximale prévue tenue proprement : élastique supérieur.',
    mus:'Infra-épineux, petit rond', cues:['Coude reste collé à la serviette','Omoplate basse'],
    schema:'  vue de dessus :\n        ● tête\n     ┌──┼──┐\n     │     │╲ coude collé\n     │     │ ╲___◄ la main part vers l’extérieur', ok:['Toutes les rép. sans appréhension'], stop:['Ressaut ou sensation d’instabilité'] },
  er9090: { n:'Rotation externe à 90/90 (élastique)', fam:'Prévention épaule', kind:'strength', zone:'shoulder', load:0, step:0, unit:'rép.', repsProg:true, inj:true,
    obj:'Renforcer la coiffe dans la position d’armé du tir.',
    tech:'Bras à 90° d’abduction, coude à 90°, légèrement en avant du plan du corps. Rotation vers l’arrière dans l’amplitude sans appréhension.',
    mus:'Infra-épineux, petit rond, trapèze inférieur', cues:['S’arrêter avant toute appréhension'],
    schema:'          ▲ main\n          │\n    O─────┘ coude à hauteur d’épaule\n   /|', ok:['Fluide, sans appréhension'], stop:['Appréhension','Douleur antérieure'] },
  scap: { n:'Travail scapulaire (pompe « plus » / Y-T-W)', fam:'Prévention épaule', kind:'strength', zone:'shoulder', load:0, step:0, unit:'rép.', repsProg:true,
    obj:'Dentelé antérieur et trapèze inférieur : plaquer et orienter l’omoplate.',
    tech:'Pompe « plus » bras tendus (seules les omoplates bougent), puis Y-T-W allongé sur banc incliné à charge très légère.',
    mus:'Dentelé antérieur, trapèzes moyen et inférieur', cues:['Coudes verrouillés sur la pompe plus','Pouces vers le plafond en Y-T-W'],
    schema:'  Y : \\O/    T : ─O─    W : \\/O\\/', ok:['Positions tenues sans compensation'], stop:['Douleur en position Y'] },
  pallof: { n:'Pallof press', fam:'Gainage', kind:'strength', zone:null, load:0, step:0, unit:'rép.', repsProg:true,
    obj:'Anti-rotation : le tronc transmet la force au tir sans se tordre.',
    tech:'Élastique ou poulie sur le côté, mains contre le sternum, pousser bras tendus devant, tenir 2 s, revenir. Le tronc ne tourne pas.',
    mus:'Obliques, transverse', cues:['Bassin et épaules face devant'],
    schema:'  ancrage ●~~~~~~ ▭ mains\n                 O  bras tendus\n                /|\\', ok:['Zéro rotation'], stop:['Douleur lombaire'] },
  sideplank: { n:'Gainage latéral', fam:'Gainage', kind:'time', zone:null, load:30, step:5, unit:'s',
    obj:'Carré des lombes, obliques, moyen fessier.', tech:'Appui sur l’avant-bras, coude sous l’épaule, corps aligné, bassin haut.',
    mus:'Obliques, carré des lombes, moyen fessier', cues:['Coude sous l’épaule'],
    schema:'    O\n     \\__________\n     ▔ coude', ok:['Durée tenue des deux côtés'], stop:['Douleur à l’épaule d’appui'] },
  medball: { n:'Lancers médecine-ball (rotation)', fam:'Puissance', kind:'strength', zone:'shoulder', load:3, step:1, unit:'kg',
    obj:'Puissance de rotation du tronc transférée au bras, sans armé extrême.',
    tech:'De profil au mur, rotation des hanches puis du tronc, lancer explosif, rattraper bras souples.',
    mus:'Obliques, fessiers, dentelé, chaîne croisée', cues:['Hanches avant bras','Bras souples à la réception'],
    schema:'  O ●→→→ ║ mur\n /|\\     ║\n / \\     ║', ok:['Vitesse constante, aucune douleur'], stop:['Douleur épaule'] },
  prevroutine: { n:'Routine prévention épaule (avant collectif)', fam:'Prévention épaule', kind:'check', zone:'shoulder',
    obj:'Activer la coiffe avant les entraînements collectifs et les tirs.',
    tech:'8 minutes : rotation externe élastique 2 × 15, face pull élastique 2 × 15, Y-T-W 1 × 8, pompe « plus » 1 × 12, 10 lancers progressifs à 50-70 %.',
    mus:'Coiffe des rotateurs, stabilisateurs de l’omoplate', cues:['À faire avant chaque entraînement collectif'],
    schema:'RE ▸ face pull ▸ Y-T-W ▸ pompe + ▸ lancers progressifs', ok:['Routine complète, épaule « prête »'], stop:['Appréhension pendant les lancers'] },

  court: { n:'Fractionné court', fam:'Course', kind:'ladder', ladder:'court', zone:'calf', impact:true, run:true, alt:'Vélo / home-trainer, même structure et même RPE',
    obj:'Développer la puissance aérobie et la capacité intermittente propre au handball.',
    tech:'Efforts courts à vitesse élevée, récupération en trot ou passive selon le format. Foulée sous le bassin, cadence élevée, relâchement des épaules. Chaque répétition à la même vitesse.',
    mus:'Système cardio-respiratoire, triceps sural, ischio-jambiers',
    cues:['Échauffement complet obligatoire','Allure régulière (dernière = première)','Arrêter à la moindre pointe localisée au mollet'],
    schema:'  vitesse\n   ▲  ┌┐  ┌┐  ┌┐  ┌┐  effort\n   │──┘└──┘└──┘└──┘└── récup\n   └────────────────────▶ temps',
    ok:['Toutes les répétitions à vitesse constante','Foulée inchangée','Mollets sans aggravation à 24 h et 48 h'],
    stop:['Tiraillement ou douleur localisée au mollet','Foulée qui se modifie / boiterie','Douleur ≥ seuil orange'] },
  long: { n:'Fractionné long', fam:'Course', kind:'ladder', ladder:'long', zone:'calf', impact:true, run:true, alt:'Vélo / home-trainer, même structure et même RPE',
    obj:'Élever le seuil et la capacité à répéter les efforts sur un match.',
    tech:'Efforts de 1 à 8 minutes à allure soutenue, récupération active. Ta base marathon est un atout : le facteur limitant est la tolérance des mollets, pas le moteur.',
    mus:'Système cardio-respiratoire, triceps sural',
    cues:['Allure tenue sur toutes les fractions','Terrain souple de préférence'],
    schema:'  vitesse\n   ▲  ┌────┐  ┌────┐  ┌────┐\n   │──┘    └──┘    └──┘    └──\n   └──────────────────────────▶',
    ok:['Allures tenues','Mollets sans aggravation à 24 h et 48 h'],
    stop:['Douleur mollet ≥ seuil orange','Gêne qui augmente au fil des fractions'] },
  proprio: { n:'Proprioception', fam:'Proprio & agilité', kind:'level', family:'proprio', zone:'calf',
    obj:'Réentraîner l’équilibre unipodal, la stabilisation et les réceptions.', tech:'Voir les exercices du niveau en cours.',
    mus:'Muscles stabilisateurs de cheville, genou et hanche', cues:['Qualité avant quantité','Commencer par la jambe la plus faible'],
    schema:'     O\n    /|\\\n     |    unipodal, genou légèrement fléchi\n     |\n    _/    pied « tripode » (talon, base du 1er et 5e orteil)', ok:['Stabilité sans appui du 2ᵉ pied','Qualité identique G/D'], stop:['Douleur mollet','Cheville qui part en inversion'] },
  appuis: { n:'Petits appuis', fam:'Proprio & agilité', kind:'level', family:'appuis', zone:'calf', impact:true,
    obj:'Coordination, fréquence d’appuis et déplacements latéraux.', tech:'Voir les exercices du niveau en cours.',
    mus:'Triceps sural, fléchisseurs de hanche, système nerveux', cues:['Rester sur l’avant-pied','Bras actifs'],
    schema:'  ║▭║▭║▭║▭║  échelle de rythme\n  ● ● ● ●   appuis rapides', ok:['Rythme fluide sans erreur d’appui'], stop:['Douleur mollet'] },
  agilite: { n:'Agilité', fam:'Proprio & agilité', kind:'level', family:'agilite', zone:'calf', impact:true,
    obj:'Changements de direction, freinages, réactivité et spécifique ailier.', tech:'Voir les exercices du niveau en cours.',
    mus:'Quadriceps (excentrique), fessiers, adducteurs, triceps sural', cues:['Freinage bassin bas, appuis courts','Regard vers la nouvelle direction'],
    schema:'     ●────────►┐\n                │ freinage en 3 appuis\n     ◄──────────● bassin bas', ok:['Appuis propres sans glissade','Pas de valgus'], stop:['Appui planté jambe tendue avec douleur','Douleur mollet ≥ seuil orange'] }
};

/* ---------- Programme : composition des séances par phase ----------
  [id, séries, répétitions cibles, RPE cible, repos] */
const BLUEPRINT = {
  1: { A:[['squat',3,10,7,'2′'],['rdl',3,10,7,'2′'],['split',3,8,7,'1′30'],['legcurl',3,12,7,'1′30'],['calf_straight',4,12,7,'1′30'],['calf_bent',3,15,7,'1′'],['proprio',1,0,5,'—'],['plank',3,0,6,'45″']],
       B:[['warmup',1,0,4,'—'],['court',1,0,8,'selon format'],['cooldown',1,0,3,'—']],
       C:[['row',3,12,7,'1′30'],['bench',3,10,7,'1′30'],['pulldown',3,10,7,'1′30'],['facepull',3,15,6,'1′'],['er',3,15,6,'45″'],['scap',2,12,5,'45″'],['pallof',3,10,6,'45″'],['sideplank',3,0,6,'45″']],
       D:[['warmup',1,0,4,'—'],['long',1,0,7,'selon format'],['proprio',1,0,5,'—'],['appuis',1,0,5,'—'],['agilite',1,0,6,'—'],['cooldown',1,0,3,'—']] },
  2: { A:[['squat',4,6,8,'2′30'],['rdl',4,6,8,'2′'],['split',3,6,8,'1′30'],['nordic',3,5,8,'2′'],['calf_straight',4,10,8,'1′30'],['calf_bent',4,12,8,'1′'],['copenhagen',3,0,7,'1′']],
       B:[['warmup',1,0,4,'—'],['court',1,0,8,'selon format'],['accel',1,6,7,'marche retour'],['cooldown',1,0,3,'—']],
       C:[['row',4,8,8,'1′30'],['landmine',3,8,7,'1′30'],['pulldown',4,8,8,'1′30'],['facepull',3,15,6,'1′'],['er9090',3,12,6,'1′'],['scap',2,10,5,'45″'],['pallof',3,12,6,'45″'],['sideplank',3,0,6,'45″']],
       D:[['warmup',1,0,4,'—'],['long',1,0,7,'selon format'],['pogo',3,20,6,'1′'],['proprio',1,0,5,'—'],['appuis',1,0,6,'—'],['agilite',1,0,7,'—'],['cooldown',1,0,3,'—']] },
  3: { A:[['squat',3,5,7,'2′30'],['rdl',3,5,7,'2′'],['split',2,6,7,'1′30'],['nordic',2,5,7,'2′'],['boxjump',3,5,6,'1′30'],['calf_straight',3,10,7,'1′30'],['calf_bent',3,12,7,'1′']],
       B:[['warmup',1,0,4,'—'],['court',1,0,8,'selon format'],['accel',1,8,8,'marche retour'],['cooldown',1,0,3,'—']],
       C:[['prevroutine',1,0,4,'—'],['row',3,8,7,'1′30'],['landmine',3,6,7,'1′30'],['pulldown',3,8,7,'1′30'],['er9090',3,12,6,'1′'],['medball',3,6,7,'1′'],['pallof',3,12,6,'45″']],
       D:[['warmup',1,0,4,'—'],['long',1,0,7,'selon format'],['proprio',1,0,5,'—'],['appuis',1,0,6,'—'],['agilite',1,0,8,'—'],['cooldown',1,0,3,'—']] },
  4: { A:[['squat',4,4,8,'3′'],['cmj',4,4,7,'2′'],['rdl',3,5,8,'2′'],['nordic',2,6,7,'2′'],['calf_straight',3,10,7,'1′30'],['calf_bent',3,12,7,'1′'],['copenhagen',2,0,7,'1′']],
       B:[['warmup',1,0,4,'—'],['court',1,0,9,'selon format'],['accel',1,8,8,'marche retour'],['cooldown',1,0,3,'—']],
       C:[['prevroutine',1,0,4,'—'],['row',3,6,8,'1′30'],['landmine',3,6,8,'1′30'],['pulldown',3,6,8,'1′30'],['er9090',3,15,6,'1′'],['medball',4,5,8,'1′'],['sideplank',3,0,6,'45″']],
       D:[['warmup',1,0,4,'—'],['long',1,0,8,'selon format'],['pogo',3,20,6,'1′'],['agilite',1,0,8,'—'],['appuis',1,0,7,'—'],['cooldown',1,0,3,'—']] }
};

/* Valeurs de départ des répétitions pour les exercices à progression en répétitions */
const REPS_START = { nordic:4, boxjump:5, cmj:4, pogo:15, accel:6, er:12, er9090:10, scap:10, pallof:10 };
const REPS_MAX   = { nordic:8, boxjump:6, cmj:5, pogo:30, accel:10, er:20, er9090:15, scap:15, pallof:15 };

/* ---------- Critères de validation de phase (modifiables) ---------- */
const DEFAULT_CRITERIA = {
  1: ['Au moins 13 des 16 séances de la phase réalisées','Exercices de force exécutés avec une technique propre','Tolérance musculaire des mollets satisfaisante à 24 h et 48 h','Absence d’aggravation des symptômes sur la phase','Fractionné court et long réalisés sans douleur le lendemain','Bilan fonctionnel de fin de phase 1 réalisé et revu avec le kiné'],
  2: ['Séances de la phase 2 réalisées','Appuis multidirectionnels et freinages maîtrisés (agilité niveau ≥ 3)','Accélérations progressives tolérées','Évaluation fonctionnelle avant reprise collective réalisée','Avis favorable du kiné pour la reprise collective','Aucune aggravation des symptômes mollets / épaule'],
  3: ['Entraînements collectifs tolérés, charge hebdomadaire stable','Force maintenue (charges ≥ fin de phase 2)','Déplacements défensifs et changements de direction sans appréhension','Pas de symptôme persistant 48 h après un entraînement collectif','Bilan de fin de phase 3 réalisé'],
  4: ['Bilan final de progression réalisé','Tolérance à la charge collective complète','Prévention maintenue (routines épaule et mollets ≥ 2 fois par semaine)']
};

/* ---------- Bilans fonctionnels : tests (résultats saisis par l'utilisateur uniquement) ---------- */
const TESTS = [
  { id:'calfraise', n:'Calf raise unilatéral max (genou tendu, métronome 60 bpm)', unit:'rép.', bi:true, higher:true },
  { id:'kneewall', n:'Genou-au-mur (dorsiflexion)', unit:'cm', bi:true, higher:true },
  { id:'balance', n:'Équilibre unipodal yeux fermés', unit:'s', bi:true, higher:true },
  { id:'hop', n:'Single hop test (si autorisé par le kiné)', unit:'cm', bi:true, higher:true },
  { id:'sprint10', n:'Sprint 10 m', unit:'s', bi:false, higher:false },
  { id:'sprint20', n:'Sprint 20 m', unit:'s', bi:false, higher:false },
  { id:'vift', n:'Test intermittent 30-15 IFT (VIFT)', unit:'km/h', bi:false, higher:true },
  { id:'cmj', n:'Saut contre-mouvement (CMJ)', unit:'cm', bi:false, higher:true },
  { id:'erendur', n:'Endurance rotateurs externes épaule (rép. propres)', unit:'rép.', bi:true, higher:true },
  { id:'stab', n:'Stabilité subjective de l’épaule', unit:'/10', bi:false, higher:true }
];

/* ---------- Seuils de vigilance par défaut (à faire valider par le kiné) ---------- */
const DEFAULT_THRESHOLDS = {
  calfPain:     { o:3, r:5, label:'Douleur mollet (0-10)', dir:'up' },
  calfStiff:    { o:4, r:7, label:'Raideur matinale mollet (0-10)', dir:'up' },
  calfDelta:    { o:2, r:3, label:'Hausse de douleur mollet en 24 h (points)', dir:'up' },
  shPain:       { o:3, r:5, label:'Douleur épaule (0-10)', dir:'up' },
  shStab:       { o:6, r:4, label:'Stabilité épaule (0-10, 10 = très stable)', dir:'down' },
  fatigue:      { o:7, r:9, label:'Fatigue générale (0-10)', dir:'up' },
  sleep:        { o:4, r:2, label:'Qualité du sommeil (0-10)', dir:'down' },
  rhrDelta:     { o:5, r:8, label:'Montre : FC au repos au-dessus de ta moyenne 7 j (bpm)', dir:'up' },
  hrvDrop:      { o:15, r:25, label:'Montre : VFC sous ta moyenne 7 j (%)', dir:'up' },
  sessionPain:  { o:3, r:5, label:'Douleur pendant un exercice (0-10)', dir:'up' }
};
